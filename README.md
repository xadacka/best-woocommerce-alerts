# Best WooCommerce Alerter

A WordPress plugin that provides real-time order alerts for WooCommerce and fixes common order timestamp and integration issues.

## Features

### 🔔 Real-time Order Alerts
- Visual flash alerts when new orders are received
- Customisable sound alerts
- Admin dashboard notifications
- Works only with actually paid orders (processing/completed)

### 🕒 Order Timestamp Fix
- **Problem**: WooCommerce shows order creation time instead of payment completion time
- **Solution**: Automatically updates order dates to show when payment was actually completed
- **Result**: Orders show "2 minutes ago" instead of "1 hour ago" when recently paid

### 🔗 Proper Integration Hooks
- Provides correct hooks for other plugins (e.g., Twilio SMS)
- Prevents premature notifications on order creation
- Only triggers when payment is actually completed
- Compatible with WooCommerce High Performance Order Storage (HPOS)

## Installation

### Automatic Installation (Recommended)
1. In your WordPress admin, go to **Plugins → Add New**
2. Search for "Best Order Alerter for WooCommerce"
3. Click **Install Now** and then **Activate**
4. Go to **WooCommerce → Order Alerts** to configure

### Manual Installation
1. Download the plugin zip file
2. Go to **Plugins → Add New → Upload Plugin**
3. Upload the zip file and click **Install Now**
4. Click **Activate Plugin**
5. Go to **WooCommerce → Order Alerts** to configure

### Developer Installation
1. Clone or download this repository
2. Upload the plugin files to `/wp-content/plugins/best-woocommerce-alerts/`
3. Activate the plugin through the 'Plugins' screen in WordPress
4. Go to **WooCommerce → Order Alerts** to configure settings

## Configuration

### Basic Settings
- **Alert Sound**: Choose custom MP3 files or use the default alert sound
- **Test Sound**: Preview your selected alert sound
- **Reset Alerts**: Clear your device's alert history

### Advanced Settings
- **Fix Order Timestamps**: Enable/disable automatic timestamp correction
- When enabled, orders will display payment completion time instead of creation time

## Integration with Other Plugins

### Twilio SMS Plugin Fix

If you're using a Twilio plugin that sends SMS notifications, you can prevent it from sending messages on order creation by modifying it to use our proper hooks:

```php
// Replace this line in your Twilio plugin:
add_action('woocommerce_new_order', 'your_sms_function');

// With this:
add_action('best_woo_alerts_payment_completed', 'your_sms_function_with_payment_check', 10, 4);
```

See `INTEGRATION-GUIDE.md` for detailed integration instructions.

## Requirements

- WordPress 5.0 or higher
- WooCommerce 6.0 or higher
- PHP 7.2 or higher

## HPOS Compatibility

Fully compatible with WooCommerce's High Performance Order Storage (HPOS). The plugin automatically detects HPOS and updates the appropriate database tables.

## Supported Order Statuses

The plugin only alerts for orders with these statuses:
- `processing` (payment completed)
- `completed` (order fulfilled)

Excludes:
- `pending` (awaiting payment)
- `on-hold` (awaiting action)
- `cancelled`, `refunded`, `failed`

## Features in Detail

### Timestamp Correction
When an order transitions from any unpaid status (`pending`, `on-hold`, etc.) to a paid status (`processing`, `completed`), the plugin:

1. Updates the order creation date to the current time
2. Works with both traditional WordPress posts and HPOS
3. Clears relevant caches
4. Logs the change for debugging

### Integration Hooks
The plugin provides these action hooks for other plugins:

- `best_woo_alerts_payment_completed` - Fires when payment is completed
- `woocommerce_payment_actually_completed` - Generic payment completion hook

## Debugging

Enable WordPress debug logging to monitor the plugin:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check `/wp-content/debug.log` for plugin activity.

## Support

For support or feature requests, please create an issue on the repository or contact support.

## License

GPL v2 or later - see LICENSE file for details.

---

Made with ❤️ by [Florian.ie](https://github.com/xadacka) for WooCommerce store owners 