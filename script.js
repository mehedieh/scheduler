document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG & STATE ---
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const timeSlots = [
        '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
        '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
    ];
    let classes = JSON.parse(sessionStorage.getItem('scheduleClasses')) || [];
    let selectedClassId = null;

    // --- DOM ELEMENTS ---
    const grid = document.getElementById('schedule-grid');
    const editorForm = document.getElementById('class-form');
    const defaultMessage = document.getElementById('default-message');
    const deleteBtn = document.getElementById('deleteBtn');

    // ==================================================================
    // BUG FIX: REWRITTEN RENDERING LOGIC
    // ==================================================================

    /**
     *  Builds the static grid skeleton.
     *  This function runs ONLY ONCE when the page loads.
     *  It creates the time/day headers and the empty, clickable cells.
     */
    function initializeGridSkeleton() {
        grid.innerHTML = ''; // Clear only once at the very beginning
        grid.style.gridTemplateColumns = `0.8fr repeat(${timeSlots.length}, 1.5fr)`;
        
        // Add headers
        grid.innerHTML += `<div class="grid-cell header">Time</div>`;
        timeSlots.forEach(time => grid.innerHTML += `<div class="grid-cell header">${time}</div>`);

        // Add day rows and their cells
        days.forEach((day, dayIndex) => {
            grid.innerHTML += `<div class="grid-cell header">${day}</div>`;
            timeSlots.forEach((time, timeIndex) => {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.day = dayIndex;
                cell.dataset.time = timeIndex;
                grid.appendChild(cell);
            });
        });
    }

    /**
     *  Renders all class blocks on top of the existing grid.
     *  This is the ONLY function that should draw classes. It first removes
     *  all old class blocks and then redraws the current list from scratch
     *  without ever harming the grid skeleton.
     */
    function renderAllClasses() {
        // First, remove ONLY the old class items, not the grid cells
        document.querySelectorAll('.class-item').forEach(item => item.remove());

        // Now, add each class from our data array to the grid
        classes.forEach(cls => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            classItem.dataset.id = cls.id;
            
            // Highlight the selected class
            if (cls.id === selectedClassId) {
                classItem.classList.add('selected');
            }
            
            classItem.style.backgroundColor = cls.color;
            
            // Position the item on the CSS Grid
            const duration = Math.max(1, cls.duration);
            classItem.style.gridColumn = `${cls.time + 2} / span ${duration}`;
            classItem.style.gridRow = `${cls.day + 2}`;
            
            // Add the content inside the class block
            classItem.innerHTML = `
                <div class="code">${cls.code}</div>
                <div class="title">${cls.title}</div>
                <div class="teacher">${cls.teacher || ''}</div> 
            `;
            
            // Place the new class item directly onto the grid
            grid.appendChild(classItem);
        });
    }

    // --- EDITOR & FORM LOGIC --- (This section is mostly the same and correct)
    function showEditor(state, data) {
        if (state === 'new' || state === 'edit') {
            defaultMessage.classList.add('hidden');
            editorForm.classList.remove('hidden');

            if (editorForm['day-select'].options.length === 0) {
                days.forEach((d, i) => editorForm['day-select'].add(new Option(d, i)));
                timeSlots.forEach((t, i) => editorForm['start-time-select'].add(new Option(t, i)));
                timeSlots.forEach((t, i) => editorForm['end-time-select'].add(new Option(t, i)));
            }
            
            if (state === 'new') {
                editorForm.reset();
                editorForm['class-id'].value = '';
                editorForm['day-select'].value = data.day;
                editorForm['start-time-select'].value = data.time;
                editorForm['end-time-select'].value = Math.min(timeSlots.length - 1, data.time + 1);
                editorForm['class-color'].value = '#a5d8ff';
                deleteBtn.classList.add('hidden');
            } else { // 'edit'
                editorForm['class-id'].value = data.id;
                editorForm['course-code'].value = data.code;
                editorForm['course-title'].value = data.title;
                editorForm['teacher-name'].value = data.teacher || '';
                editorForm['day-select'].value = data.day;
                editorForm['start-time-select'].value = data.time;
                editorForm['end-time-select'].value = data.time + data.duration - 1;
                editorForm['class-color'].value = data.color;
                deleteBtn.classList.remove('hidden');
            }
        } else { // 'default'
            defaultMessage.classList.remove('hidden');
            editorForm.classList.add('hidden');
            selectedClassId = null;
        }
    }

    // --- EVENT HANDLERS ---
    grid.addEventListener('click', (e) => {
        const classTarget = e.target.closest('.class-item');
        const cellTarget = e.target.closest('.grid-cell:not(.header)');

        if (classTarget) {
            selectedClassId = parseInt(classTarget.dataset.id);
            const classData = classes.find(c => c.id === selectedClassId);
            showEditor('edit', classData);
        } else if (cellTarget) {
            selectedClassId = null; // Deselect any previously selected class
            const day = cellTarget.dataset.day;
            const time = cellTarget.dataset.time;
            showEditor('new', { day, time: parseInt(time) });
        }
        // Always re-render to update the 'selected' highlight correctly
        renderAllClasses();
    });

    editorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(editorForm['class-id'].value);
        const startTime = parseInt(editorForm['start-time-select'].value);
        const endTime = parseInt(editorForm['end-time-select'].value);
        
        if (endTime < startTime) {
            alert("End time cannot be before start time.");
            return;
        }

        const classData = {
            id: id || Date.now(),
            code: editorForm['course-code'].value,
            title: editorForm['course-title'].value,
            teacher: editorForm['teacher-name'].value,
            day: parseInt(editorForm['day-select'].value),
            time: startTime,
            duration: (endTime - startTime) + 1,
            color: editorForm['class-color'].value
        };

        if (id) {
            classes = classes.map(c => c.id === id ? classData : c);
        } else {
            classes.push(classData);
        }
        
        // Save data and redraw the classes on the grid
        sessionStorage.setItem('scheduleClasses', JSON.stringify(classes));
        renderAllClasses();
        
        // Return editor to the default state
        showEditor('default');
    });

    deleteBtn.addEventListener('click', () => {
        if (!selectedClassId) return;
        classes = classes.filter(c => c.id !== selectedClassId);
        
        // Save the new state and redraw
        sessionStorage.setItem('scheduleClasses', JSON.stringify(classes));
        renderAllClasses();
        
        // Return editor to default state
        showEditor('default');
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        const scheduleNode = document.getElementById('schedule-grid');
        // Temporarily deselect for a clean screenshot
        const selectedItem = scheduleNode.querySelector('.class-item.selected');
        if (selectedItem) {
            selectedItem.classList.remove('selected');
        }

        html2canvas(scheduleNode, { backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'my-class-schedule.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Add the selection back if it was there
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        });
    });

    // --- INITIALIZE APPLICATION ---
    initializeGridSkeleton(); // 1. Build the static grid first.
    renderAllClasses();       // 2. Render any saved classes on top of it.
    showEditor('default');    // 3. Set the editor to its initial state.
});
