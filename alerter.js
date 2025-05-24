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
    `).appendTo('head');
    
    // Add connection indicator
    $('<div id="best-woo-connection">Connected</div>').appendTo('body');
    
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
    
    // Auto-refresh the orders page using AJAX instead of full page reload
    if (window.location.pathname.includes('/wp-admin/admin.php') && 
        window.location.search.includes('page=wc-orders')) {
        setInterval(function() {
            // Trigger WooCommerce's built-in AJAX refresh if available
            if (typeof jQuery.fn.block === 'function') {
                $('.wc-orders-list-table').closest('form').find('.refresh').trigger('click');
            }
        }, 15000);
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