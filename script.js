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
    // BUG FIX: STABLE RENDERING LOGIC
    // ==================================================================

    /**
     * Builds the static grid skeleton using the stable `appendChild` method.
     * This runs ONLY ONCE and will never destroy the page layout.
     */
    function initializeGridSkeleton() {
        grid.innerHTML = ''; // Clear the grid container once.
        grid.style.gridTemplateColumns = `0.8fr repeat(${timeSlots.length}, 1.5fr)`;

        // Create headers using the safe method
        const timeHeader = document.createElement('div');
        timeHeader.className = 'grid-cell header';
        timeHeader.textContent = 'Time';
        grid.appendChild(timeHeader);

        timeSlots.forEach(time => {
            const headerCell = document.createElement('div');
            headerCell.className = 'grid-cell header';
            headerCell.textContent = time;
            grid.appendChild(headerCell);
        });

        // Create day rows and their cells using the safe method
        days.forEach((day, dayIndex) => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'grid-cell header';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);

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
     * Renders all class blocks on top of the existing grid.
     * This function is safe and only modifies the class items themselves.
     */
    function renderAllClasses() {
        document.querySelectorAll('.class-item').forEach(item => item.remove());

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

    // --- EDITOR & FORM LOGIC --- (No changes needed here)
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
            selectedClassId = null;
            const day = cellTarget.dataset.day;
            const time = cellTarget.dataset.time;
            showEditor('new', { day, time: parseInt(time) });
        }
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
        
        sessionStorage.setItem('scheduleClasses', JSON.stringify(classes));
        renderAllClasses();
        showEditor('default');
    });

    deleteBtn.addEventListener('click', () => {
        if (!selectedClassId) return;
        classes = classes.filter(c => c.id !== selectedClassId);
        sessionStorage.setItem('scheduleClasses', JSON.stringify(classes));
        renderAllClasses();
        showEditor('default');
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        const scheduleNode = document.getElementById('schedule-grid');
        const selectedItem = scheduleNode.querySelector('.class-item.selected');
        if (selectedItem) {
            selectedItem.classList.remove('selected');
        }

        html2canvas(scheduleNode, { backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'my-class-schedule.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        });
    });

    // --- INITIALIZE APPLICATION ---
    initializeGridSkeleton();
    renderAllClasses();
    showEditor('default');
});
