/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

function ui_tab_switch(pageName, elem) {
    // Hide all elements with class="tabcontent" by default */
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName('tabcontent');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
    }

    // Remove the background color of all tablinks/buttons
    tablinks = document.getElementsByClassName('tablink');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove('tablink_active');
    }

    // Show the specific tab content
    document.getElementById(pageName).style.display = 'block';

    elem.classList.add('tablink_active');
}

function ui_accordion_switch(elem) {
    /* Toggle between adding and removing the "active" class,
        to highlight the button that controls the panel */
    elem.classList.toggle('accordion_active');

    /* Toggle between hiding and showing the active panel */
    const panel = elem.nextElementSibling;
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
    }
}

/**
 * Selektiert einen Wert in einem Dropdown-Element
 * @param {*} elem Element
 * @param {*} val Wert
 * @returns {boolean} Element gefunden
 */
function ui_setSelectedIndex(elem, val) {
    for (let i = 0; i < elem.options.length; i++) {
        if (elem.options[i].value == val) {
            elem.options[i].selected = true;
            return true;
        }
    }
    return false;
}
