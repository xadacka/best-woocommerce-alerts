<?php
/*
Plugin Name: Best Order Alerter for WooCommerce
Plugin URI: https://wordpress.org/plugins/best-order-alerter-for-woocommerce/
Description: Plays a sound in the admin dashboard and flashes the screen red when a new WooCommerce order is received. Also fixes order timestamp issues and provides proper hooks for payment completion.
Version: 1.0.2
Requires at least: 5.0
Requires PHP: 7.2
Author: Florian.ie
Author URI: https://github.com/xadacka
License: GPL v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: best-order-alerter-for-woocommerce
Domain Path: /languages
WC requires at least: 6.0
WC tested up to: 8.5
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Check if WooCommerce is active
function best_woo_alerts_init() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            ?>
            <div class="error">
                <p><?php esc_html_e('Best Order Alerter for WooCommerce requires WooCommerce to be installed and activated.', 'best-order-alerter-for-woocommerce'); ?></p>
            </div>
            <?php
        });
        return;
    }

    // Fix order timestamp issues by updating order date when payment is completed
    add_action('woocommerce_order_status_changed', 'best_woo_alerts_fix_order_timestamp', 10, 4);
    
    // Provide proper hooks for other plugins to use for payment completion
    add_action('woocommerce_order_status_changed', 'best_woo_alerts_payment_completed_hook', 10, 4);

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
            esc_html__('Order Alerts Settings', 'best-order-alerter-for-woocommerce'),
            esc_html__('Order Alerts', 'best-order-alerter-for-woocommerce'),
            'manage_woocommerce',
            'best-woo-alerts',
            'best_woo_alerts_settings_page'
        );
    });

    // Register settings with sanitization
    add_action('admin_init', function() {
        register_setting(
            'best_woo_alerts_options',
            'best_woo_alerts_sound',
            array(
                'type' => 'string',
                'sanitize_callback' => 'esc_url_raw',
                'default' => plugin_dir_url(__FILE__) . 'defaultalert.mp3'
            )
        );
        
        register_setting(
            'best_woo_alerts_options',
            'best_woo_alerts_fix_timestamps',
            array(
                'type' => 'boolean',
                'sanitize_callback' => 'rest_sanitize_boolean',
                'default' => true
            )
        );
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
            'current_order_number' => $order_number,
            'i18n' => [
                'new_order' => esc_html__('NEW ORDER! #', 'best-order-alerter-for-woocommerce'),
                'dismiss_alert' => esc_html__("I've seen this", 'best-order-alerter-for-woocommerce'),
                'enable_sound' => esc_html__('Enable Sound Alerts', 'best-order-alerter-for-woocommerce'),
                'connected' => esc_html__('Connected', 'best-order-alerter-for-woocommerce'),
                'disconnected' => esc_html__('Disconnected', 'best-order-alerter-for-woocommerce'),
                'sound_error' => esc_html__('Could not play sound. Please click the Enable Sound button.', 'best-order-alerter-for-woocommerce'),
            ]
        ]);
    });
}

/**
 * Fix order timestamp to show payment completion time instead of order creation time
 */
function best_woo_alerts_fix_order_timestamp($order_id, $from_status, $to_status, $order) {
    // Only proceed if this feature is enabled
    if (!get_option('best_woo_alerts_fix_timestamps', true)) {
        return;
    }
    
    // Check if the order is transitioning to a paid status
    $paid_statuses = array('processing', 'completed');
    $unpaid_statuses = array('pending', 'on-hold', 'cancelled', 'refunded', 'failed');
    
    // If transitioning from unpaid to paid status
    if (in_array($from_status, $unpaid_statuses) && in_array($to_status, $paid_statuses)) {
        // Update the order date to current time (payment completion time)
        $current_time = current_time('mysql');
        
        // For HPOS compatibility, we need to handle both traditional posts and HPOS
        if (class_exists('Automattic\WooCommerce\Utilities\OrderUtil') && 
            \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()) {
            // HPOS is enabled - update the order date in the custom table
            global $wpdb;
            $wpdb->update(
                $wpdb->prefix . 'wc_orders',
                array('date_created_gmt' => get_gmt_from_date($current_time)),
                array('id' => $order_id),
                array('%s'),
                array('%d')
            );
            
            // Also update the local date
            $wpdb->update(
                $wpdb->prefix . 'wc_orders',
                array('date_created' => $current_time),
                array('id' => $order_id),
                array('%s'),
                array('%d')
            );
        } else {
            // Traditional posts table
            wp_update_post(array(
                'ID' => $order_id,
                'post_date' => $current_time,
                'post_date_gmt' => get_gmt_from_date($current_time)
            ));
        }
        
        // Clear any caches
        if (function_exists('wc_delete_shop_order_transients')) {
            wc_delete_shop_order_transients($order_id);
        }
        
        // Log the change for debugging
        error_log("Best WooCommerce Alerts: Updated order #{$order_id} timestamp to payment completion time: {$current_time}");
    }
}

/**
 * Provide proper hooks for other plugins to use for actual payment completion
 * This prevents plugins like Twilio from sending notifications on order creation
 */
function best_woo_alerts_payment_completed_hook($order_id, $from_status, $to_status, $order) {
    $paid_statuses = array('processing', 'completed');
    $unpaid_statuses = array('pending', 'on-hold', 'cancelled', 'refunded', 'failed');
    
    // If transitioning from unpaid to paid status
    if (in_array($from_status, $unpaid_statuses) && in_array($to_status, $paid_statuses)) {
        // Fire a custom action that other plugins should use instead of woocommerce_new_order
        do_action('best_woo_alerts_payment_completed', $order_id, $order, $from_status, $to_status);
        
        // Also fire the more generic action
        do_action('woocommerce_payment_actually_completed', $order_id, $order);
        
        error_log("Best WooCommerce Alerts: Payment completed for order #{$order_id}, transitioning from {$from_status} to {$to_status}");
    }
}

// Settings page HTML
function best_woo_alerts_settings_page() {
    if (!current_user_can('manage_woocommerce')) {
        wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'best-order-alerter-for-woocommerce'));
    }

    wp_enqueue_media();
    ?>
    <div class="wrap">
        <h1><?php esc_html_e('Order Alerts Settings', 'best-order-alerter-for-woocommerce'); ?></h1>
        <form method="post" action="options.php">
            <?php settings_fields('best_woo_alerts_options'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><?php esc_html_e('Alert Sound', 'best-order-alerter-for-woocommerce'); ?></th>
                    <td>
                        <input type="text" id="best_woo_alerts_sound" name="best_woo_alerts_sound" 
                               value="<?php echo esc_attr(get_option('best_woo_alerts_sound')); ?>" class="regular-text" />
                        <button type="button" class="button" id="best_woo_sound_upload"><?php esc_html_e('Choose Sound', 'best-order-alerter-for-woocommerce'); ?></button>
                        <button type="button" class="button" id="best_woo_sound_test"><?php esc_html_e('Test Sound', 'best-order-alerter-for-woocommerce'); ?></button>
                        <p class="description"><?php esc_html_e('Select an MP3 file from your media library or enter a URL.', 'best-order-alerter-for-woocommerce'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php esc_html_e('Fix Order Timestamps', 'best-order-alerter-for-woocommerce'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="best_woo_alerts_fix_timestamps" value="1" <?php checked(get_option('best_woo_alerts_fix_timestamps', true)); ?> />
                            <?php esc_html_e('Update order date to payment completion time', 'best-order-alerter-for-woocommerce'); ?>
                        </label>
                        <p class="description"><?php esc_html_e('When enabled, orders will show the time they were paid rather than when they were created. This fixes the issue where orders show "1 hour ago" even if they were just paid.', 'best-order-alerter-for-woocommerce'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php esc_html_e('Reset Alerts', 'best-order-alerter-for-woocommerce'); ?></th>
                    <td>
                        <button type="button" class="button" id="best_woo_reset"><?php esc_html_e('Reset Alert State', 'best-order-alerter-for-woocommerce'); ?></button>
                        <p class="description"><?php esc_html_e('Clears your device\'s alert history.', 'best-order-alerter-for-woocommerce'); ?></p>
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
                title: '<?php esc_html_e('Select Sound File', 'best-order-alerter-for-woocommerce'); ?>',
                button: {text: '<?php esc_html_e('Use this sound', 'best-order-alerter-for-woocommerce'); ?>'},
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
            var soundUrl = $('#best_woo_alerts_sound').val() || '<?php echo esc_js(plugin_dir_url(__FILE__) . 'defaultalert.mp3'); ?>';
            var audio = new Audio(soundUrl);
            audio.play().catch(function(e) {
                alert('<?php echo esc_js(__('Could not play sound. Try clicking somewhere on the page first.', 'best-order-alerter-for-woocommerce')); ?>');
            });
        });
        
        // Reset alerts
        $('#best_woo_reset').on('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('best_woo_alert_last_order');
            alert('<?php echo esc_js(__('Alert state has been reset for this device.', 'best-order-alerter-for-woocommerce')); ?>');
        });
    });
    </script>
    <?php
}

// Initialize the plugin after WooCommerce is loaded
add_action('plugins_loaded', 'best_woo_alerts_init');
