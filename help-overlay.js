// help-overlay.js - with fully customizable steps (with optional images)

document.addEventListener('DOMContentLoaded', function () {
    // ======================================================
    // EDITABLE CONFIGURATION - Modify these steps as needed
    // ======================================================
    const HELP_STEPS = [
        {
            title: "STEP 1: LAUNCH THE SCANNER",
            // Set to null or remove this property to have no image for this step
            // image: "/api/placeholder/300/200",
            description: "Click the \"INITIATE SCAN\" button to activate your device camera. For mobile devices, you can switch between front and back cameras."
        },
        {
            title: "STEP 2: SELECT BASE COLOR",
            image: "/image/step2_basecolor.jpg",
            description: "Use the color picker to select a base color for comparison. The scanner will highlight differences upon scanning the image that you want to identify. NOTE: Different environment and lighting will require a change in base color, therefore you can change the color accordingly."
        },
        {
            title: "STEP 3: ANALYZE RESULTS",
            image: "/image/step3_example.jpg",
            description: "Check for anomalies such as skin texture overly smooth. Prominent tell-tale sign, are the inconsistency in the lighting for AI-generated images."
        },
        {
            title: "STEP 4: MORE EXAMPLES",
            image: "/image/step3_example2.jpg",
            description: "This is another example for identification of humans, look out for the inconsistency in the lightings."
        },
        {
            title: "STEP 4: NON-HUMAN EXAMPLES",
            image: "/image/step3_example2.jpg",
            description: "For non-human images, the scanner will highlight artifacts caused by imperfection in AI-generated visuals. Look out for the distorted text in building skylines or any form of signages that consist of illegible wordings."
        },
        {
            title: "ALTERNATE: UPLOAD IMAGE",
            // Another example with no image
            description: "Instead of using the camera, you can upload an image by clicking \"OR UPLOAD IMAGE\" and selecting a file from your device."
        }
    ];

    // Technical note - easily editable
    const TECHNICAL_NOTE = {
        title: "TECHNICAL NOTES",
        content: "The Visual Normalcy Scanner uses WebGL to process images and highlight differences from the selected base color. This technology can be used to identify visual anomalies and patterns that may not be immediately apparent to the human eye."
    };

    // Help button configuration
    const HELP_BUTTON_CONFIG = {
        text: "?",
        title: "Help Guide",
        position: {
            right: "20px",
            verticalPosition: "50%" // center of screen
        }
    };

    // Overlay title
    const OVERLAY_TITLE = "USER GUIDE & TIPS ON IDENTIFICATION";
    // ======================================================
    // END OF EDITABLE CONFIGURATION
    // ======================================================

    // Create the sticky help button
    const helpButton = document.createElement('button');
    helpButton.id = 'helpButton';
    helpButton.innerHTML = HELP_BUTTON_CONFIG.text;
    helpButton.title = HELP_BUTTON_CONFIG.title;

    // Apply position settings
    helpButton.style.right = HELP_BUTTON_CONFIG.position.right;
    helpButton.style.top = HELP_BUTTON_CONFIG.position.verticalPosition;
    helpButton.style.transform = "translateY(-50%)";

    document.body.appendChild(helpButton);

    // Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'helpOverlay';
    overlay.className = 'help-overlay';

    // Create close button for the overlay
    const closeButton = document.createElement('button');
    closeButton.id = 'closeOverlay';
    closeButton.innerHTML = '×';
    closeButton.className = 'close-button';
    overlay.appendChild(closeButton);

    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'help-content';
    overlay.appendChild(contentContainer);

    // Add overlay to body
    document.body.appendChild(overlay);

    // Add title to content
    const title = document.createElement('h2');
    title.textContent = OVERLAY_TITLE;
    contentContainer.appendChild(title);

    // Add steps to content container
    HELP_STEPS.forEach((step, index) => {
        const stepContainer = document.createElement('div');
        stepContainer.className = 'step-container';

        const stepTitle = document.createElement('h3');
        stepTitle.textContent = step.title;
        stepContainer.appendChild(stepTitle);

        // Only add image if one is provided
        if (step.image) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'step-image-container';

            const img = document.createElement('img');
            img.src = step.image;
            img.alt = step.title;
            img.className = 'step-image';
            imgContainer.appendChild(img);
            stepContainer.appendChild(imgContainer);
        }

        const description = document.createElement('p');
        description.textContent = step.description;
        stepContainer.appendChild(description);

        contentContainer.appendChild(stepContainer);
    });

    // Add technical note
    if (TECHNICAL_NOTE) {
        const note = document.createElement('div');
        note.className = 'tech-note';

        const noteTitle = document.createElement('h3');
        noteTitle.textContent = TECHNICAL_NOTE.title;
        note.appendChild(noteTitle);

        const noteContent = document.createElement('p');
        noteContent.textContent = TECHNICAL_NOTE.content;
        note.appendChild(noteContent);

        contentContainer.appendChild(note);
    }

    // Add event listeners for button clicks
    helpButton.addEventListener('click', function () {
        overlay.classList.add('active');
    });

    closeButton.addEventListener('click', function () {
        overlay.classList.remove('active');
    });

    // Close overlay when clicking outside of content
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});