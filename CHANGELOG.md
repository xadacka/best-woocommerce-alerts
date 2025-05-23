# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2024-03-21

### Added
- **Auto-Refresh Orders Page**: AJAX-based automatic refreshing of WooCommerce orders table
- **Live Time Updates**: Timestamps automatically count up (e.g., "6 minutes ago" becomes "7 minutes ago")
- **Configurable Settings**: Control auto-refresh and live time updates from admin panel
- **Refresh Interval Setting**: Configure refresh frequency (30-600 seconds, default 2 minutes)
- **Dual Page Support**: Works with both new HPOS orders page and legacy orders page
- **Visual Indicators**: Subtle refresh indicator shows when orders table is updating
- **Translation Support**: Proper i18n support for all relative time strings
- **Smart Refresh**: Orders table refreshes immediately when new orders are detected

### Enhanced
- Better detection of different WooCommerce orders page layouts
- Improved user experience with non-intrusive auto-refresh
- More granular control over plugin behaviour via settings
- Enhanced debugging and logging for orders page features

### Technical Details
- Added `detectOrdersPage()` function for page detection
- Added `refreshOrdersTable()` with multiple fallback methods
- Added `updateRelativeTimes()` for live timestamp updates
- Added `formatRelativeTime()` with proper translation support
- Added settings for auto_refresh, refresh_interval, and live_time_updates
- Improved JavaScript modularisation and error handling

## [1.0.2] - 2024-03-21

### Added
- **Order Timestamp Fix**: Orders now show payment completion time instead of creation time
- **Integration Hooks**: Proper action hooks for other plugins to prevent premature notifications
- **HPOS Compatibility**: Full support for WooCommerce High Performance Order Storage
- **HPOS Declaration**: Explicit compatibility declaration to prevent WordPress warnings
- **Settings Option**: Toggle to enable/disable timestamp fixing
- **Debug Logging**: Enhanced logging for payment completion events
- **Integration Guide**: Documentation for configuring other plugins (e.g., Twilio)

### Fixed
- Order timestamps now accurately reflect when payment was completed, not when order was created
- Prevents plugins like Twilio from sending SMS notifications on order creation instead of payment completion
- HPOS incompatibility warning by properly declaring feature support
- Improved compatibility with WooCommerce's High Performance Order Storage (HPOS)

### Changed
- Plugin description updated to reflect new features
- Enhanced error logging for better debugging
- Improved database update logic for both traditional posts and HPOS

### Technical Details
- Added `best_woo_alerts_fix_order_timestamp()` function for timestamp correction
- Added `best_woo_alerts_payment_completed_hook()` function for proper integration hooks
- New action hooks: `best_woo_alerts_payment_completed` and `woocommerce_payment_actually_completed`
- Automatic detection of HPOS vs traditional post storage
- Proper cache clearing after timestamp updates

## [1.0.1] - 2024-03-20

### Initial Release
- Real-time order alert system for WooCommerce
- Visual flash alerts with customisable sounds
- Only alerts for paid orders (processing/completed status)
- AJAX-based polling system
- WordPress media library integration for custom sounds
- Secure implementation with nonces and capability checks
- Connection status indicator
- Local storage for alert state management

### Features
- Full-screen red flash notification
- Audio alerts with browser autoplay handling
- Admin settings page under WooCommerce menu
- Test sound functionality
- Reset alert state functionality
- Mobile-friendly responsive design
- Auto-reconnection on connection loss
- Dismissible alerts with order number display 