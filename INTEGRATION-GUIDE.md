# Integration Guide for Best WooCommerce Alerter

## Overview

This plugin not only provides order alerts but also fixes common WooCommerce issues with order timestamps and provides proper hooks for payment completion events.

## Problem Solved

### Order Timestamp Issues
- **Problem**: WooCommerce orders show creation time instead of payment completion time
- **Impact**: Orders appear as "1 hour ago" even if they were just paid
- **Solution**: This plugin automatically updates the order date to payment completion time

### Plugin Integration Issues
- **Problem**: Plugins like Twilio send notifications when orders are created, not when they're paid
- **Impact**: Customers receive SMS messages for unpaid orders
- **Solution**: Use our proper payment completion hooks instead of `woocommerce_new_order`

## Configuration

### Enable/Disable Timestamp Fixing

1. Go to **WooCommerce → Order Alerts** in your WordPress admin
2. Check/uncheck "Update order date to payment completion time"
3. Save settings

### For Twilio Plugin Configuration

Instead of using the standard `woocommerce_new_order` hook, modify your Twilio plugin to use:

```php
// Instead of this (sends on order creation):
add_action('woocommerce_new_order', 'send_twilio_sms');

// Use this (sends only on payment completion):
add_action('best_woo_alerts_payment_completed', 'send_twilio_sms_on_payment', 10, 4);

function send_twilio_sms_on_payment($order_id, $order, $from_status, $to_status) {
    // Your Twilio SMS sending code here
    // This will only fire when payment is actually completed
}
```

### Alternative Hook

You can also use the more generic hook:

```php
add_action('woocommerce_payment_actually_completed', 'send_twilio_sms_on_payment', 10, 2);

function send_twilio_sms_on_payment($order_id, $order) {
    // Your Twilio SMS sending code here
}
```

## Supported Payment Transitions

The plugin detects payment completion when orders transition from:

**From (unpaid statuses):**
- pending
- on-hold
- cancelled
- refunded
- failed

**To (paid statuses):**
- processing
- completed

## HPOS Compatibility

This plugin is fully compatible with WooCommerce's High Performance Order Storage (HPOS). It automatically detects whether HPOS is enabled and updates the correct database tables.

## Testing

To test if the integration is working:

1. Place a test order but don't complete payment
2. Verify no SMS is sent
3. Complete the payment
4. Verify SMS is sent only now
5. Check the order list - the order should show the payment completion time, not creation time

## Debugging

Enable WordPress debug logging to see when payment completion events are fired:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check `/wp-content/debug.log` for entries like:
```
Best WooCommerce Alerts: Payment completed for order #123, transitioning from pending to processing
```

## Troubleshooting

### Timestamps not updating
- Check that "Fix Order Timestamps" is enabled in settings
- Verify the order is transitioning from unpaid to paid status
- Check debug logs for timestamp update entries

### Other plugins still sending premature notifications
- Ensure they're using the correct hooks provided by this plugin
- Check if they have their own configuration options for payment completion
- Consider modifying their code as shown in the examples above

## Support

For issues related to this plugin, please contact support or create an issue on the repository. 