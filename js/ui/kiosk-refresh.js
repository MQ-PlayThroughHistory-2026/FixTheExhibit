document.addEventListener('DOMContentLoaded', () => {
    // Timeout Configuration (in milliseconds & seconds)
    const IDLE_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes in ms
    const COUNTDOWN_TIME = 60;             // 1 minute in seconds

    // State Tracking variables
    let idleTimer;
    let countdownTimer;
    let secondsRemaining = COUNTDOWN_TIME;
    let isWarningActive = false;

    // DOM Elements
    const modal = document.getElementById('timeoutModal');
    const countdownDisplay = document.getElementById('countdown');
    const btnContinue = document.getElementById('btnContinue');

    // DOM events that reset the activity timer
    const activityEvents = [
        'mousemove', 
        'keydown', 
        'click', 
        'scroll', 
        'touchstart', 
        'touchmove', 
        'pointerdown',
        'pointermove',
    ];

    // Function to handle user activity detection
    function handleUserActivity() {
        if (isWarningActive) {
            handleContinue();
        } else {
            resetIdleTimer();
        }
    }

    // Reset the primary 5-minute inactivity timer
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(showWarningModal, IDLE_TIME_LIMIT);
    }

    // Trigger the Warning Modal and start the 1-minute countdown
    function showWarningModal() {
        isWarningActive = true;
        secondsRemaining = COUNTDOWN_TIME;
        if (countdownDisplay) countdownDisplay.textContent = secondsRemaining;
        
        // Remove the hidden class to reveal the overlay
        if (modal) modal.classList.remove('hidden');

        countdownTimer = setInterval(() => {
            secondsRemaining--;
            if (countdownDisplay) countdownDisplay.textContent = secondsRemaining;

            if (secondsRemaining <= 0) {
                refreshPage();
            }
        }, 1000);
    }

    // Dismiss modal and reset idle tracking
    function handleContinue() {
        clearInterval(countdownTimer);
        if (modal) modal.classList.add('hidden');
        isWarningActive = false;
        resetIdleTimer();
    }

    // Reload the current page
    function refreshPage() {
        window.location.reload();
    }

    // Attach activity event listeners to window
    activityEvents.forEach(event => {
        window.addEventListener(event, handleUserActivity, { capture: true, passive: true });
    });

    // Attach continue button action
    if (btnContinue) {
        btnContinue.addEventListener('click', (e) => {
            e.stopPropagation();
            handleContinue();
        });
    }

    // Initialize timer on load
    resetIdleTimer();
});