document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG & STATE ---
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'];
    let classes = JSON.parse(localStorage.getItem('scheduleClasses')) || [];
    let selectedClassId = null;

    // --- DOM ELEMENTS ---
    const grid = document.getElementById('schedule-grid');
    const editorForm = document.getElementById('class-form');
    const defaultMessage = document.getElementById('default-message');
    const deleteBtn = document.getElementById('deleteBtn');

    // --- RENDER FUNCTIONS ---
    function renderGrid() {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `0.8fr repeat(${timeSlots.length}, 1.5fr)`;
        
        // Time Headers
        grid.innerHTML += `<div class="grid-cell header">Time</div>`;
        timeSlots.forEach(time => grid.innerHTML += `<div class="grid-cell header">${time}</div>`);

        // Day Rows and Cells
        days.forEach((day, dayIndex) => {
            grid.innerHTML += `<div class="grid-cell header">${day}</div>`;
            timeSlots.forEach((time, timeIndex) => {
                grid.innerHTML += `<div class="grid-cell" data-day="${dayIndex}" data-time="${timeIndex}"></div>`;
            });
        });
        // Call renderClasses AFTER the grid structure is built
        renderClasses();
    }

    function renderClasses() {
        document.querySelectorAll('.class-item').forEach(item => item.remove());
        classes.forEach(cls => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            classItem.dataset.id = cls.id;
            if (cls.id === selectedClassId) {
                classItem.classList.add('selected');
            }
            classItem.style.backgroundColor = cls.color;
            // Ensure duration is at least 1
            const duration = Math.max(1, cls.duration);
            classItem.style.gridColumn = `${cls.time + 2} / span ${duration}`;
            classItem.style.gridRow = `${cls.day + 2}`;

            // CHANGED: Added teacher display
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
                editorForm['teacher-name'].value = data.teacher || ''; // NEW: Populate teacher name
                editorForm['day-select'].value = data.day;
                editorForm['start-time-select'].value = data.time;
                editorForm['end-time-select'].value = data.time + data.duration - 1;
                editorForm['class-color'].value = data.color;
                deleteBtn.classList.remove('hidden');
            }
        } else { // 'default'
            defaultMessage.classList.remove('hidden');
            editorForm.classList.add('hidden');
            selectedClassId = null; // Deselect when going back to default
        }
    }

    // --- EVENT HANDLERS ---
    grid.addEventListener('click', (e) => {
        // Use .closest() to handle clicks on the text inside the class item
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
            teacher: editorForm['teacher-name'].value, // NEW: Save teacher name
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
        showEditor('default'); // Go back to default view after saving
    });

    deleteBtn.addEventListener('click', () => {
        if (!selectedClassId) return;
        classes = classes.filter(c => c.id !== selectedClassId);
        selectedClassId = null;
        saveAndRender();
        showEditor('default');
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        const scheduleNode = document.getElementById('schedule-grid');
        const selected = scheduleNode.querySelector('.selected');
        if (selected) selected.classList.remove('selected');

        html2canvas(scheduleNode).then(canvas => {
            const link = document.createElement('a');
            link.download = 'my-class-schedule.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            if (selected) selected.classList.add('selected');
        });
    });

    // --- HELPER FUNCTIONS ---
    function saveAndRender() {
        localStorage.setItem('scheduleClasses', JSON.stringify(classes));
        // BUG FIX: Always render the full grid to ensure empty cells are present
        renderGrid();
    }

    // --- INITIALIZE ---
    renderGrid();
    showEditor('default');
});
