=== Best Order Alerter for WooCommerce ===
Contributors: florianstravock
Tags: woocommerce, orders, alerts, notifications, timestamp, sms, twilio
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.2
Stable tag: 1.0.2
License: GPL v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Real-time order alerts for WooCommerce that also fixes order timestamp issues and provides proper hooks for payment completion.

== Description ==

**Best Order Alerter for WooCommerce** provides instant visual and audio alerts when new paid orders are received, whilst also solving common WooCommerce issues with order timestamps and plugin integrations.

= 🔔 Real-time Order Alerts =
* Visual flash alerts when new orders are received
* Customisable sound alerts
* Admin dashboard notifications
* Works only with actually paid orders (processing/completed)

= 🕒 Order Timestamp Fix =
* **Problem**: WooCommerce shows order creation time instead of payment completion time
* **Solution**: Automatically updates order dates to show when payment was actually completed
* **Result**: Orders show "2 minutes ago" instead of "1 hour ago" when recently paid

= 🔗 Proper Integration Hooks =
* Provides correct hooks for other plugins (e.g., Twilio SMS)
* Prevents premature notifications on order creation
* Only triggers when payment is actually completed
* Compatible with WooCommerce High Performance Order Storage (HPOS)

= Key Features =
* **Real-time monitoring** - Polls for new orders every 15 seconds
* **Smart filtering** - Only alerts for paid orders, ignores pending/cancelled orders
* **HPOS compatible** - Works with WooCommerce's new order storage system
* **Timestamp correction** - Orders show actual payment time, not creation time
* **Integration hooks** - Proper actions for other plugins to prevent premature notifications
* **Customisable sounds** - Upload your own alert sounds or use the default
* **Visual connection status** - See if the system is connected and working
* **Mobile friendly** - Works on all devices and screen sizes

= Perfect for =
* Store owners who want instant order notifications
* Businesses with Twilio SMS plugins that send premature notifications
* Stores using HPOS who want accurate order timestamps
* Anyone frustrated with orders showing incorrect "time ago" values

= Technical Features =
* AJAX-based real-time polling
* Secure implementation with WordPress nonces
* Local storage for alert state management
* Automatic reconnection on connection loss
* WordPress media library integration
* Comprehensive error handling and logging

== Installation ==

= Automatic Installation =
1. In your WordPress admin, go to **Plugins → Add New**
2. Search for "Best Order Alerter for WooCommerce"
3. Click **Install Now** and then **Activate**
4. Go to **WooCommerce → Order Alerts** to configure

= Manual Installation =
1. Download the plugin zip file
2. Go to **Plugins → Add New → Upload Plugin**
3. Upload the zip file and click **Install Now**
4. Click **Activate Plugin**
5. Go to **WooCommerce → Order Alerts** to configure

= Requirements =
* WordPress 5.0 or higher
* WooCommerce 6.0 or higher
* PHP 7.2 or higher
* JavaScript enabled browser

== Configuration ==

After activation, go to **WooCommerce → Order Alerts**:

= Basic Settings =
* **Alert Sound**: Choose custom MP3 files from your media library or enter a URL
* **Test Sound**: Preview your selected alert sound
* **Reset Alerts**: Clear your device's alert history

= Advanced Settings =
* **Fix Order Timestamps**: Enable/disable automatic timestamp correction
* When enabled, orders will display payment completion time instead of creation time

== Integration with Other Plugins ==

= Twilio SMS Plugin Fix =

If you're using a Twilio plugin that sends SMS notifications on order creation instead of payment completion, you can fix this by modifying the plugin to use our proper hooks:

**Before (sends on order creation):**
`add_action('woocommerce_new_order', 'send_twilio_sms');`

**After (sends only on payment completion):**
`add_action('best_woo_alerts_payment_completed', 'send_twilio_sms_on_payment', 10, 4);`

See the **Integration Guide** in the plugin files for detailed instructions.

== Frequently Asked Questions ==

= Does this work with WooCommerce HPOS? =
Yes! The plugin automatically detects whether you're using High Performance Order Storage and updates the correct database tables.

= Why do my orders show the wrong time? =
WooCommerce shows order creation time instead of payment completion time. Enable our "Fix Order Timestamps" setting to correct this.

= Can I use custom alert sounds? =
Yes! Go to WooCommerce → Order Alerts and either upload an MP3 file or enter a custom URL.

= Will this work on shared hosting? =
Yes, the plugin is designed to work on all hosting environments and doesn't require special server access.

= Does it work with all payment gateways? =
Yes, it works with any payment gateway that properly updates order status to 'processing' or 'completed' when payment is received.

= Can I disable the timestamp fixing feature? =
Yes, you can enable/disable this feature in the plugin settings.

== Screenshots ==

1. Plugin settings page showing alert sound configuration and timestamp fixing options
2. Real-time order alert overlay with dismiss button
3. Connection status indicator showing live connection
4. WooCommerce orders list showing corrected timestamps

== Changelog ==

= 1.0.2 =
* Added: Order timestamp fix - orders now show payment completion time instead of creation time
* Added: Integration hooks for other plugins to prevent premature notifications
* Added: Full HPOS compatibility for WooCommerce's High Performance Order Storage
* Added: Settings option to enable/disable timestamp fixing
* Added: Enhanced debug logging for payment completion events
* Added: Integration guide for configuring other plugins (e.g., Twilio)
* Fixed: Order timestamps now accurately reflect when payment was completed
* Fixed: Prevents plugins like Twilio from sending SMS notifications on order creation
* Changed: Plugin description updated to reflect new features
* Changed: Enhanced error logging for better debugging

= 1.0.1 =
* Initial release
* Real-time order alert system for WooCommerce
* Visual flash alerts with customisable sounds
* Only alerts for paid orders (processing/completed status)
* AJAX-based polling system
* WordPress media library integration for custom sounds
* Secure implementation with nonces and capability checks
* Connection status indicator
* Local storage for alert state management

== Upgrade Notice ==

= 1.0.2 =
Major update! Now fixes order timestamp issues and provides proper integration hooks for other plugins. Highly recommended for all users, especially those using Twilio SMS plugins or HPOS.

== Technical Information ==

= Order Statuses Monitored =
* `processing` (payment completed)
* `completed` (order fulfilled)

= Order Statuses Ignored =
* `pending` (awaiting payment)
* `on-hold` (awaiting action)
* `cancelled`, `refunded`, `failed`

= Action Hooks Provided =
* `best_woo_alerts_payment_completed` - Fires when payment is completed (4 parameters)
* `woocommerce_payment_actually_completed` - Generic payment completion hook (2 parameters)

= HPOS Compatibility =
Automatically detects and supports both traditional WordPress posts and WooCommerce's High Performance Order Storage.

== Support ==

For support, please visit the plugin's support forum or contact the developer. For integration questions, see the Integration Guide included with the plugin.

== Privacy ==

This plugin does not collect, store, or transmit any personal data. All alert state is stored locally in the user's browser using localStorage. 