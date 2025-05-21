<?php
/*
Plugin Name: Best WooCommerce Alerts
Description: Plays a sound in the admin dashboard and flashes the screen red when a new WooCommerce order is received.
Version: 1.0
Author: Florian.ie
Author URI: https://github.com/xadacka
*/

if (!defined('ABSPATH')) exit;

// Check if WooCommerce is active
function best_woo_alerts_init() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            ?>
            <div class="error">
                <p>Best WooCommerce Alerts requires WooCommerce to be installed and activated.</p>
            </div>
            <?php
        });
        return;
    }

    // Add AJAX endpoint
    add_action('wp_ajax_best_woo_alerts_check', function() {
        check_ajax_referer('best_woo_alerts_nonce', 'nonce');
        if (!current_user_can('manage_woocommerce')) wp_send_json_error();
        
        // Get the most recent order using WooCommerce's API
        $args = array(
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => array('wc-completed', 'wc-processing'), // Only include paid orders
            'type' => 'shop_order', // Only include actual orders, not refunds
        );
        
        $orders = wc_get_orders($args);
        
        if (!empty($orders) && $orders[0] instanceof WC_Order) {
            $latest_order = $orders[0];
            $order_number = $latest_order->get_order_number(); // This gets the actual displayed order number
            wp_send_json_success(array('order_number' => $order_number));
        } else {
            wp_send_json_success(array('order_number' => 0));
        }
    });

    // Add settings page under WooCommerce menu
    add_action('admin_menu', function() {
        add_submenu_page(
            'woocommerce',
            'Best WooCommerce Alerts Settings',
            'Order Alerts',
            'manage_woocommerce',
            'best-woo-alerts',
            'best_woo_alerts_settings_page'
        );
    });

    // Register settings
    add_action('admin_init', function() {
        register_setting('best_woo_alerts_options', 'best_woo_alerts_sound');
    });

    // Enqueue JS for admin dashboard
    add_action('admin_enqueue_scripts', function($hook) {
        if (!current_user_can('manage_woocommerce')) return;
        
        // Get latest order number using WooCommerce's API
        $args = array(
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => array('wc-completed', 'wc-processing'), // Only include paid orders
            'type' => 'shop_order', // Only include actual orders, not refunds
        );
        
        $orders = wc_get_orders($args);
        $order_number = 0;
        
        if (!empty($orders) && $orders[0] instanceof WC_Order) {
            $latest_order = $orders[0];
            $order_number = $latest_order->get_order_number();
        }
        
        wp_enqueue_script(
            'best-woo-alerts-js',
            plugin_dir_url(__FILE__) . 'alerter.js',
            ['jquery'],
            time(),
            true
        );
        
        wp_localize_script('best-woo-alerts-js', 'bestWooAlerter', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('best_woo_alerts_nonce'),
            'sound'    => get_option('best_woo_alerts_sound', plugin_dir_url(__FILE__) . 'defaultalert.mp3'),
            'current_order_number' => $order_number
        ]);
    });
}

// Settings page HTML
function best_woo_alerts_settings_page() {
    if (!current_user_can('manage_woocommerce')) {
        wp_die(__('You do not have sufficient permissions to access this page.'));
    }

    wp_enqueue_media();
    ?>
    <div class="wrap">
        <h1>Best WooCommerce Alerts Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('best_woo_alerts_options'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">Alert Sound</th>
                    <td>
                        <input type="text" id="best_woo_alerts_sound" name="best_woo_alerts_sound" 
                               value="<?php echo esc_attr(get_option('best_woo_alerts_sound')); ?>" class="regular-text" />
                        <button type="button" class="button" id="best_woo_sound_upload">Choose Sound</button>
                        <button type="button" class="button" id="best_woo_sound_test">Test Sound</button>
                        <p class="description">Select an MP3 file from your media library or enter a URL.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Reset Alerts</th>
                    <td>
                        <button type="button" class="button" id="best_woo_reset">Reset Alert State</button>
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
        $('#best_woo_sound_upload').on('click', function(e) {
            e.preventDefault();
            var uploader = wp.media({
                title: 'Select Sound File',
                button: {text: 'Use this sound'},
                library: {type: 'audio'},
                multiple: false
            }).on('select', function() {
                var attachment = uploader.state().get('selection').first().toJSON();
                $('#best_woo_alerts_sound').val(attachment.url);
            }).open();
        });

        // Test sound
        $('#best_woo_sound_test').on('click', function(e) {
            e.preventDefault();
            var soundUrl = $('#best_woo_alerts_sound').val() || plugin_dir_url(__FILE__) + 'defaultalert.mp3';
            var audio = new Audio(soundUrl);
            audio.play().catch(function(e) {
                alert('Could not play sound. Try clicking somewhere on the page first.');
            });
        });
        
        // Reset alerts
        $('#best_woo_reset').on('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('best_woo_alert_last_order');
            alert('Alert state has been reset for this device.');
        });
    });
    </script>
    <?php
}

// Initialize the plugin after WooCommerce is loaded
add_action('plugins_loaded', 'best_woo_alerts_init');
