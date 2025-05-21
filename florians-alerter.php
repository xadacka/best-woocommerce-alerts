<?php
/*
Plugin Name: Florians Alerter
Description: Plays a sound in the admin dashboard and flashes the screen red when a new WooCommerce order is received.
Version: 1.0
Author: Florian Stravock
*/

if (!defined('ABSPATH')) exit;

// Add AJAX endpoint
add_action('wp_ajax_florians_alerter_check', function() {
    check_ajax_referer('florians_alerter_nonce', 'nonce');
    if (!current_user_can('manage_woocommerce')) wp_send_json_error();
    
    // Get the most recent order using WooCommerce's API
    $args = array(
        'limit' => 1,
        'orderby' => 'date',
        'order' => 'DESC',
    );
    
    $orders = wc_get_orders($args);
    
    if (!empty($orders)) {
        $latest_order = $orders[0];
        $order_number = $latest_order->get_order_number(); // This gets the actual displayed order number
        wp_send_json_success(array('order_number' => $order_number));
    } else {
        wp_send_json_success(array('order_number' => 0));
    }
});

// Add settings page
add_action('admin_menu', function() {
    add_options_page(
        'Florians Alerter Settings',
        'Order Alerter',
        'manage_options',
        'florians-alerter',
        'florians_alerter_settings_page'
    );
});

// Register settings
add_action('admin_init', function() {
    register_setting('florians_alerter_options', 'florians_alerter_sound');
});

function florians_alerter_settings_page() {
    wp_enqueue_media();
    ?>
    <div class="wrap">
        <h1>Florians Alerter Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('florians_alerter_options'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">Alert Sound</th>
                    <td>
                        <input type="text" id="florians_alerter_sound" name="florians_alerter_sound" 
                               value="<?php echo esc_attr(get_option('florians_alerter_sound')); ?>" class="regular-text" />
                        <button type="button" class="button" id="florians_sound_upload">Choose Sound</button>
                        <button type="button" class="button" id="florians_sound_test">Test Sound</button>
                        <p class="description">Select an MP3 file from your media library or enter a URL.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Reset Alerts</th>
                    <td>
                        <button type="button" class="button" id="florians_reset">Reset Alert State</button>
                        <p class="description">Clears your device's alert history.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <script>
    jQuery(document).ready(function($) {
        // Media uploader
        $('#florians_sound_upload').on('click', function(e) {
            e.preventDefault();
            var uploader = wp.media({
                title: 'Select Sound File',
                button: {text: 'Use this sound'},
                library: {type: 'audio'},
                multiple: false
            }).on('select', function() {
                var attachment = uploader.state().get('selection').first().toJSON();
                $('#florians_alerter_sound').val(attachment.url);
            }).open();
        });

        // Test sound
        $('#florians_sound_test').on('click', function(e) {
            e.preventDefault();
            var soundUrl = $('#florians_alerter_sound').val() || 'https://cdn.pixabay.com/audio/2022/10/16/audio_12c6fae5b2.mp3';
            var audio = new Audio(soundUrl);
            audio.play().catch(function(e) {
                alert('Could not play sound. Try clicking somewhere on the page first.');
            });
        });
        
        // Reset alerts
        $('#florians_reset').on('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('florians_alert_last_order');
            alert('Alert state has been reset for this device.');
        });
    });
    </script>
    <?php
}

// Enqueue JS for admin dashboard
add_action('admin_enqueue_scripts', function() {
    if (!current_user_can('manage_woocommerce')) return;
    
    // Get latest order number using WooCommerce's API
    $args = array(
        'limit' => 1,
        'orderby' => 'date',
        'order' => 'DESC',
    );
    
    $orders = wc_get_orders($args);
    if ( $latest_order instanceof WC_Order ) {
    $order_number = $latest_order->get_order_number();
} else {
    $order_number = 0;
}
    
    wp_enqueue_script(
        'florians-alerter-js',
        plugin_dir_url(__FILE__) . 'alerter.js',
        ['jquery'],
        time(),
        true
    );
    
    wp_localize_script('florians-alerter-js', 'floriansAlerter', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('florians_alerter_nonce'),
        'sound'    => get_option('florians_alerter_sound', 'https://cdn.pixabay.com/audio/2022/10/16/audio_12c6fae5b2.mp3'),
        'current_order_number' => $order_number
    ]);
});
