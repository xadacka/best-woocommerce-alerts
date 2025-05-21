jQuery(function($) {
    console.log('Florians Alerter initializing...');
    
    // Handle variable name issue if it exists
    if (typeof floriansAlerter === 'undefined' && typeof florinsAlerter !== 'undefined') {
        window.floriansAlerter = window.florinsAlerter;
    }
    
    // Guard against missing script variables
    if (typeof floriansAlerter === 'undefined') {
        console.error('Florians Alerter not initialized properly');
        return;
    }
    
    // Use a SINGLE localStorage key for simplicity
    const STORAGE_KEY = 'florians_alert_last_order';
    
    // Ensure we have integers for all numeric values
    let currentOrderNumber = parseInt(floriansAlerter.current_order_number || '0', 10);
    
    // Clean up localStorage for this key and ensure it's an integer
    let storedOrderNumber = localStorage.getItem(STORAGE_KEY);
    let lastSeenOrderNumber = (storedOrderNumber && !isNaN(parseInt(storedOrderNumber, 10))) 
        ? parseInt(storedOrderNumber, 10) 
        : 0;
    
    // Log initial state
    console.log('Current order number (from server):', currentOrderNumber);
    console.log('Last seen order number (from localStorage):', lastSeenOrderNumber);
    
    // Initialize audio
    let audioElement = null;
    let alertActive = false;
    
    // Add styles
    $('<style>').text(`
        #florians-alert {
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
            animation: florians-flash 1s infinite;
        }
        
        @keyframes florians-flash {
            0% { background: rgba(255, 0, 0, 0.9); }
            50% { background: rgba(255, 0, 0, 0.7); }
            100% { background: rgba(255, 0, 0, 0.9); }
        }
        
        #florians-alert-text {
            color: white;
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 30px;
            text-align: center;
        }
        
        #florians-alert-dismiss {
            background: white;
            color: red;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
        }
        
        #florians-connection {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border-radius: 5px;
            z-index: 999999;
        }
    `).appendTo('head');
    
    // Add connection indicator
    $('<div id="florians-connection">Connected</div>').appendTo('body');
    
    // Functions
    function playSound() {
        try {
            const soundUrl = floriansAlerter.sound || 'https://cdn.pixabay.com/audio/2022/10/16/audio_12c6fae5b2.mp3';
            audioElement = new Audio(soundUrl);
            audioElement.loop = true;
            audioElement.play().catch(e => console.log('Sound autoplay prevented:', e));
        } catch(e) {
            console.error('Error playing sound:', e);
        }
    }
    
    function showAlert() {
        if (alertActive) return;
        
        const alert = $(`
            <div id="florians-alert">
                <div id="florians-alert-text">NEW ORDER! #${currentOrderNumber}</div>
                <button id="florians-alert-dismiss">I've seen this</button>
            </div>
        `);
        
        $('body').append(alert);
        playSound();
        alertActive = true;
        
        console.log('Alert shown for order number:', currentOrderNumber);
    }
    
    function dismissAlert() {
        $('#florians-alert').remove();
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
        $('#florians-connection')
            .text(connected ? 'Connected' : 'Disconnected')
            .css('background', connected ? '#4CAF50' : '#F44336');
    }
    
    // Dismiss button event
    $(document).on('click', '#florians-alert-dismiss', dismissAlert);
    
    // Check for new orders
    function checkForNewOrders() {
        $.ajax({
            url: floriansAlerter.ajax_url,
            method: 'POST',
            data: {
                action: 'florians_alerter_check',
                nonce: floriansAlerter.nonce
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
    
    // Auto-refresh the orders page
    if (window.location.pathname.includes('/wp-admin/admin.php') && 
        window.location.search.includes('page=wc-orders')) {
        setInterval(function() {
            location.reload();
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
    
    console.log('Florians Alerter fully initialized');
});