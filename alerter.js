jQuery(function($) {
    console.log('Best WooCommerce Alerts initializing...');
    
    // Handle variable name issue if it exists
    if (typeof bestWooAlerter === 'undefined' && typeof floriansAlerter !== 'undefined') {
        window.bestWooAlerter = window.floriansAlerter;
    }
    
    // Guard against missing script variables
    if (typeof bestWooAlerter === 'undefined') {
        console.error('Best WooCommerce Alerts not initialized properly');
        return;
    }
    
    // Use a SINGLE localStorage key for simplicity
    const STORAGE_KEY = 'best_woo_alert_last_order';
    
    // Ensure we have integers for all numeric values
    let currentOrderNumber = parseInt(bestWooAlerter.current_order_number || '0', 10);
    
    // Clean up localStorage for this key and ensure it's an integer
    let storedOrderNumber = localStorage.getItem(STORAGE_KEY);
    let lastSeenOrderNumber = (storedOrderNumber && !isNaN(parseInt(storedOrderNumber, 10))) 
        ? parseInt(storedOrderNumber, 10) 
        : 0;
    
    // Log initial state
    console.log('Current order number (from server):', currentOrderNumber);
    console.log('Last seen order number (from localStorage):', lastSeenOrderNumber);
    
    // Initialize audio with better handling
    let audioElement = null;
    let alertActive = false;
    let soundEnabled = false;
    let userInteracted = false;
    
    // Orders page detection and auto-refresh variables
    let isOrdersPage = false;
    let isNewOrdersPage = false;
    let isLegacyOrdersPage = false;
    let ordersRefreshInterval = null;
    let timeUpdateInterval = null;
    
    // Detect which orders page we're on
    function detectOrdersPage() {
        const currentURL = window.location.href;
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        
        // New HPOS orders page
        if (currentPath.includes('/wp-admin/admin.php') && currentSearch.includes('page=wc-orders')) {
            isOrdersPage = true;
            isNewOrdersPage = true;
            console.log('Detected new WooCommerce orders page (HPOS)');
            return true;
        }
        
        // Legacy orders page (edit.php?post_type=shop_order)
        if (currentPath.includes('/wp-admin/edit.php') && currentSearch.includes('post_type=shop_order')) {
            isOrdersPage = true;
            isLegacyOrdersPage = true;
            console.log('Detected legacy WooCommerce orders page');
            return true;
        }
        
        return false;
    }

    // Add styles
    $('<style>').text(`
        #best-woo-alert {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.9);
            z-index: 9999999;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            animation: best-woo-flash 1s infinite;
        }
        
        @keyframes best-woo-flash {
            0% { background: rgba(255, 0, 0, 0.9); }
            50% { background: rgba(255, 0, 0, 0.7); }
            100% { background: rgba(255, 0, 0, 0.9); }
        }
        
        #best-woo-alert-text {
            color: white;
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 30px;
            text-align: center;
        }
        
        #best-woo-alert-dismiss {
            background: white;
            color: red;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 15px;
        }
        
        #best-woo-alert-enable-sound {
            background: white;
            color: #333;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            display: none;
        }
        
        #best-woo-alert-enable-sound.show {
            display: block;
        }
        
        #best-woo-connection {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border-radius: 5px;
            z-index: 999999;
            opacity: 0.8;
            transition: opacity 0.3s;
        }
        
        #best-woo-connection:hover {
            opacity: 1;
        }
        
        .best-woo-refresh-indicator {
            position: fixed;
            top: 32px;
            right: 20px;
            background: #0073aa;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 100000;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .best-woo-refresh-indicator.show {
            opacity: 1;
        }
    `).appendTo('head');
    
    // Add connection indicator
    $('<div id="best-woo-connection">Connected</div>').appendTo('body');
    
    // Add refresh indicator for orders page
    if (detectOrdersPage()) {
        $('<div class="best-woo-refresh-indicator">' + bestWooAlerter.i18n.auto_refreshing + '</div>').appendTo('body');
    }
    
    // Functions
    async function initializeAudio() {
        try {
            const soundUrl = bestWooAlerter.sound || plugin_dir_url(__FILE__) + 'defaultalert.mp3';
            audioElement = new Audio(soundUrl);
            audioElement.loop = true;
            
            // Try to load the audio file
            await audioElement.load();
            soundEnabled = true;
            return true;
        } catch(e) {
            console.error('Error initializing audio:', e);
            return false;
        }
    }
    
    async function playSound() {
        if (!audioElement) {
            await initializeAudio();
        }
        
        try {
            if (soundEnabled && audioElement) {
                const playPromise = audioElement.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log('Autoplay prevented:', error);
                        soundEnabled = false;
                        showSoundEnableButton();
                    });
                }
            }
        } catch(e) {
            console.error('Error playing sound:', e);
            soundEnabled = false;
            showSoundEnableButton();
        }
    }
    
    function showSoundEnableButton() {
        $('#best-woo-alert-enable-sound').addClass('show');
    }
    
    function showAlert() {
        if (alertActive) return;
        
        const alert = $(`
            <div id="best-woo-alert">
                <div id="best-woo-alert-text">${bestWooAlerter.i18n.new_order}${currentOrderNumber}</div>
                <button id="best-woo-alert-dismiss">${bestWooAlerter.i18n.dismiss_alert}</button>
                <button id="best-woo-alert-enable-sound">${bestWooAlerter.i18n.enable_sound}</button>
            </div>
        `);
        
        $('body').append(alert);
        playSound();
        alertActive = true;
        
        console.log('Alert shown for order number:', currentOrderNumber);
    }
    
    function dismissAlert() {
        $('#best-woo-alert').remove();
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
        alertActive = false;
        
        // Save the current order number as seen - ONLY using integers
        localStorage.setItem(STORAGE_KEY, currentOrderNumber.toString());
        lastSeenOrderNumber = currentOrderNumber;
        
        console.log('Alert dismissed, saved order number:', currentOrderNumber);
    }
    
    function updateConnectionStatus(connected) {
        $('#best-woo-connection')
            .text(connected ? bestWooAlerter.i18n.connected : bestWooAlerter.i18n.disconnected)
            .css('background', connected ? '#4CAF50' : '#F44336');
    }
    
    // Orders page auto-refresh functionality
    function showRefreshIndicator() {
        $('.best-woo-refresh-indicator').addClass('show');
        setTimeout(() => {
            $('.best-woo-refresh-indicator').removeClass('show');
        }, 2000);
    }
    
    function refreshOrdersTable() {
        if (!isOrdersPage) return;
        
        console.log('Refreshing orders table...');
        showRefreshIndicator();
        
        if (isNewOrdersPage) {
            // New HPOS orders page - try multiple approaches
            
            // Method 1: Trigger WooCommerce's built-in refresh button
            const refreshButton = $('.wc-orders-list-table-refresh, .refresh');
            if (refreshButton.length > 0) {
                refreshButton.trigger('click');
                console.log('Triggered WooCommerce refresh button');
                return;
            }
            
            // Method 2: Reload the table content via AJAX
            const ordersTable = $('.wp-list-table.orders');
            if (ordersTable.length > 0) {
                const currentURL = window.location.href;
                
                $.ajax({
                    url: currentURL,
                    method: 'GET',
                    success: function(response) {
                        const newTable = $(response).find('.wp-list-table.orders');
                        if (newTable.length > 0) {
                            ordersTable.replaceWith(newTable);
                            console.log('AJAX refreshed orders table');
                            
                            // Re-initialize time updates for new content
                            initializeTimeUpdates();
                        }
                    },
                    error: function() {
                        console.error('Failed to refresh orders table via AJAX');
                    }
                });
                return;
            }
        }
        
        if (isLegacyOrdersPage) {
            // Legacy orders page refresh
            const postsTable = $('.wp-list-table.posts');
            if (postsTable.length > 0) {
                const currentURL = window.location.href;
                
                $.ajax({
                    url: currentURL,
                    method: 'GET',
                    success: function(response) {
                        const newTable = $(response).find('.wp-list-table.posts');
                        if (newTable.length > 0) {
                            postsTable.replaceWith(newTable);
                            console.log('AJAX refreshed legacy orders table');
                            
                            // Re-initialize time updates for new content
                            initializeTimeUpdates();
                        }
                    },
                    error: function() {
                        console.error('Failed to refresh legacy orders table via AJAX');
                    }
                });
            }
        }
    }
    
    // Live time update functionality
    function updateRelativeTimes() {
        // Find all time elements that contain relative timestamps
        const timeSelectors = [
            '.column-date abbr[title]',           // New orders page
            '.post-date abbr[title]',             // Legacy orders page
            'time[datetime]',                     // General time elements
            '.row-date',                          // Alternative date columns
            '[data-timestamp]'                    // Custom timestamp attributes
        ];
        
        timeSelectors.forEach(selector => {
            $(selector).each(function() {
                const $element = $(this);
                const datetime = $element.attr('title') || $element.attr('datetime') || $element.data('timestamp');
                
                if (datetime) {
                    try {
                        const orderDate = new Date(datetime);
                        const now = new Date();
                        const diffInSeconds = Math.floor((now - orderDate) / 1000);
                        
                        const relativeTime = formatRelativeTime(diffInSeconds);
                        
                        // Update the text content, preserve the title/datetime attributes
                        $element.text(relativeTime);
                    } catch (e) {
                        // Ignore invalid dates
                    }
                }
            });
        });
    }
    
    function formatRelativeTime(seconds) {
        const i18n = bestWooAlerter.i18n;
        
        if (seconds < 60) {
            if (seconds <= 0) return i18n.just_now;
            return `${seconds} ${seconds === 1 ? i18n.second : i18n.seconds} ${i18n.ago}`;
        }
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} ${minutes === 1 ? i18n.minute : i18n.minutes} ${i18n.ago}`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours} ${hours === 1 ? i18n.hour : i18n.hours} ${i18n.ago}`;
        }
        
        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `${days} ${days === 1 ? i18n.day : i18n.days} ${i18n.ago}`;
        }
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) {
            return `${weeks} ${weeks === 1 ? i18n.week : i18n.weeks} ${i18n.ago}`;
        }
        
        const months = Math.floor(days / 30);
        return `${months} ${months === 1 ? i18n.month : i18n.months} ${i18n.ago}`;
    }
    
    function initializeTimeUpdates() {
        if (!isOrdersPage || !bestWooAlerter.settings.live_time_updates) return;
        
        // Clear existing interval
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
        }
        
        // Update times immediately
        updateRelativeTimes();
        
        // Set up interval to update every 30 seconds
        timeUpdateInterval = setInterval(updateRelativeTimes, 30000);
        
        console.log('Live time updates initialized');
    }
    
    function initializeOrdersPageFeatures() {
        if (!isOrdersPage) return;
        
        console.log('Initializing orders page features...');
        
        // Initialize live time updates
        if (bestWooAlerter.settings.live_time_updates) {
            initializeTimeUpdates();
        }
        
        // Set up auto-refresh if enabled
        if (bestWooAlerter.settings.auto_refresh) {
            const refreshInterval = bestWooAlerter.settings.refresh_interval * 1000; // Convert to milliseconds
            ordersRefreshInterval = setInterval(refreshOrdersTable, refreshInterval);
            console.log('Orders page auto-refresh set to ' + bestWooAlerter.settings.refresh_interval + ' seconds');
        }
    }
    
    // Event handlers
    $(document).on('click', '#best-woo-alert-dismiss', dismissAlert);
    
    $(document).on('click', '#best-woo-alert-enable-sound', async function() {
        userInteracted = true;
        soundEnabled = await initializeAudio();
        if (soundEnabled) {
            playSound();
            $(this).removeClass('show');
        }
    });
    
    // Initialize audio on any user interaction with the page
    $(document).one('click keydown', async function() {
        if (!userInteracted) {
            userInteracted = true;
            soundEnabled = await initializeAudio();
        }
    });
    
    // Check for new orders
    function checkForNewOrders() {
        $.ajax({
            url: bestWooAlerter.ajax_url,
            method: 'POST',
            data: {
                action: 'best_woo_alerts_check',
                nonce: bestWooAlerter.nonce
            },
            success: function(response) {
                updateConnectionStatus(true);
                
                if (response.success && response.data) {
                    // Parse as integer with radix to be absolutely sure
                    const newOrderNumber = parseInt(response.data.order_number || '0', 10);
                    console.log('Received order number from API:', newOrderNumber);
                    
                    // Only update if this is a new order
                    if (newOrderNumber > currentOrderNumber) {
                        console.log('New order detected:', newOrderNumber, '(was:', currentOrderNumber, ')');
                        currentOrderNumber = newOrderNumber;
                        
                        // If we're on the orders page, refresh the table immediately
                        if (isOrdersPage) {
                            refreshOrdersTable();
                        }
                        
                        // Show alert if this is a new order we haven't seen
                        if (newOrderNumber > lastSeenOrderNumber) {
                            showAlert();
                        }
                    }
                }
            },
            error: function() {
                updateConnectionStatus(false);
                console.error('Error connecting to server');
                
                // Reload page after 30 seconds of being disconnected
                setTimeout(function() {
                    location.reload();
                }, 30000);
            }
        });
    }
    
    // Initialize orders page features if we're on an orders page
    if (isOrdersPage) {
        initializeOrdersPageFeatures();
    }
    
    // Check on initialization - show alert for new orders
    if (currentOrderNumber > lastSeenOrderNumber) {
        console.log('Initial check: New order found');
        showAlert();
    } else {
        console.log('Initial check: No new orders');
    }
    
    // Poll for new orders
    setInterval(checkForNewOrders, 15000);
    
    console.log('Best WooCommerce Alerts fully initialized');
});