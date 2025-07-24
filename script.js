document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG & STATE ---
    
    // CHANGED: Time slots updated to 12-hour AM/PM format
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

    // --- RENDER FUNCTIONS ---

    // BUG FIX: This function now ONLY runs once to build the static grid.
    // It no longer destroys the grid on every save.
    function initializeGrid() {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `0.8fr repeat(${timeSlots.length}, 1.5fr)`;
        
        grid.innerHTML += `<div class="grid-cell header">Time</div>`;
        timeSlots.forEach(time => grid.innerHTML += `<div class="grid-cell header">${time}</div>`);

        days.forEach((day, dayIndex) => {
            grid.innerHTML += `<div class="grid-cell header">${day}</div>`;
            timeSlots.forEach((time, timeIndex) => {
                grid.innerHTML += `<div class="grid-cell" data-day="${dayIndex}" data-time="${timeIndex}"></div>`;
            });
        });
    }

    // BUG FIX: This is now the ONLY function that draws class items.
    // It intelligently removes old items before drawing the updated ones.
    function renderClasses() {
        // First, remove all existing class items from the grid
        document.querySelectorAll('.class-item').forEach(item => item.remove());

        // Then, draw the fresh list of classes
        classes.forEach(cls => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            classItem.dataset.id = cls.id;
            if (cls.id === selectedClassId) {
                classItem.classList.add('selected');
            }
            classItem.style.backgroundColor = cls.color;
            const duration = Math.max(1, cls.duration);
            classItem.style.gridColumn = `${cls.time + 2} / span ${duration}`;
            classItem.style.gridRow = `${cls.day + 2}`;
            classItem.innerHTML = `
                <div class="code">${cls.code}</div>
                <div class="title">${cls.title}</div>
                <div class="teacher">${cls.teacher || ''}</div> 
            `;
            grid.appendChild(classItem);
        });
    }

    // --- EDITOR & FORM LOGIC ---
    function showEditor(state, data) {
        if (state === 'new' || state === 'edit') {
            defaultMessage.classList.add('hidden');
            editorForm.classList.remove('hidden');

            // Populate select dropdowns only if they are empty
            if (editorForm['day-select'].options.length === 0) {
                days.forEach((d, i) => editorForm['day-select'].add(new Option(d, i)));
                // Use the new 12-hour time slots for the dropdowns
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
            selectedClassId = null;
            const day = cellTarget.dataset.day;
            const time = cellTarget.dataset.time;
            showEditor('new', { day, time: parseInt(time) });
        }
        // Always call renderClasses to update the 'selected' highlight
        renderClasses();
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
        
        saveAndRender();
        showEditor('default');
    });

    deleteBtn.addEventListener('click', () => {
        if (!selectedClassId) return;
        classes = classes.filter(c => c.id !== selectedClassId);
        selectedClassId = null;
        saveAndRender();
        showEditor('default');
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        // (This function remains the same and is correct)
        const scheduleNode = document.getElementById('schedule-grid');
        const selected = scheduleNode.querySelector('.selected');
        if (selected) selected.classList.remove('selected');

        html2canvas(scheduleNode, { backgroundColor: '#f8f9fa' }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'my-class-schedule.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            if (selected) selected.classList.add('selected');
        });
    });

    // --- HELPER FUNCTIONS ---
    function saveAndRender() {
        sessionStorage.setItem('scheduleClasses', JSON.stringify(classes));
        // BUG FIX: Now we ONLY call renderClasses(). The main grid is never destroyed.
        renderClasses();
    }

    // --- INITIALIZE ---
    initializeGrid(); // Build the grid skeleton once.
    renderClasses();  // Render any classes from sessionStorage on top of it.
    showEditor('default'); // Show the default message in the editor.
});
