/**
 * Client-side helpers for applying row spans to the currently visible rows of
 * a DevExtreme DataGrid.
 */
define([], () => {
    const MERGE_MARKER = 'data-scv-dx-merge';
    const PREVIOUS_STYLE = 'data-scv-dx-merge-previous-style';
    const PREVIOUS_ROWSPAN = 'data-scv-dx-merge-previous-rowspan';
    const PREVIOUS_ARIA_ROWSPAN = 'data-scv-dx-merge-previous-aria-rowspan';
    const PREVIOUS_ARIA_HIDDEN = 'data-scv-dx-merge-previous-aria-hidden';

    /** Returns the native element for a DevExtreme/jQuery element value. */
    const toNativeElement = (value) => {
        if (!value) {
            return null;
        }
        if (value.nodeType === 1) {
            return value;
        }
        if (value.jquery || value[0]) {
            return value[0] && value[0].nodeType === 1 ? value[0] : null;
        }
        return null;
    };

    /** Returns the native grid root element. */
    const getGridRoot = (gridInstance) => {
        if (!gridInstance || typeof gridInstance.element !== 'function') {
            throw new TypeError('A DevExtreme grid instance is required.');
        }
        const root = toNativeElement(gridInstance.element());
        if (!root || typeof root.querySelectorAll !== 'function') {
            throw new TypeError('The grid root element is unavailable.');
        }
        return root;
    };

    /** Restores one attribute from its saved value, then removes the marker. */
    const restoreAttribute = (cell, attribute, previousAttribute) => {
        if (cell.hasAttribute(previousAttribute)) {
            cell.setAttribute(attribute, cell.getAttribute(previousAttribute));
        } else {
            cell.removeAttribute(attribute);
        }
        cell.removeAttribute(previousAttribute);
    };

    /** Clears only the DOM changes made by this module. */
    const resetMarkedCells = (root) => {
        const markedCells = root.querySelectorAll(`[${MERGE_MARKER}]`);
        Array.prototype.forEach.call(markedCells, (cell) => {
            if (cell.hasAttribute(PREVIOUS_STYLE)) {
                cell.setAttribute('style', cell.getAttribute(PREVIOUS_STYLE));
            } else {
                cell.removeAttribute('style');
            }
            cell.removeAttribute(PREVIOUS_STYLE);
            restoreAttribute(cell, 'rowspan', PREVIOUS_ROWSPAN);
            restoreAttribute(cell, 'aria-rowspan', PREVIOUS_ARIA_ROWSPAN);
            restoreAttribute(cell, 'aria-hidden', PREVIOUS_ARIA_HIDDEN);
            cell.removeAttribute(MERGE_MARKER);
        });
    };

    /** Saves the cell state before applying a presentation-only change. */
    const markCell = (cell) => {
        if (!cell.hasAttribute(PREVIOUS_STYLE)) {
            const style = cell.getAttribute('style');
            if (style !== null) {
                cell.setAttribute(PREVIOUS_STYLE, style);
            }
        }
        if (!cell.hasAttribute(PREVIOUS_ROWSPAN) && cell.hasAttribute('rowspan')) {
            cell.setAttribute(PREVIOUS_ROWSPAN, cell.getAttribute('rowspan'));
        }
        if (!cell.hasAttribute(PREVIOUS_ARIA_ROWSPAN) && cell.hasAttribute('aria-rowspan')) {
            cell.setAttribute(PREVIOUS_ARIA_ROWSPAN, cell.getAttribute('aria-rowspan'));
        }
        if (!cell.hasAttribute(PREVIOUS_ARIA_HIDDEN) && cell.hasAttribute('aria-hidden')) {
            cell.setAttribute(PREVIOUS_ARIA_HIDDEN, cell.getAttribute('aria-hidden'));
        }
        cell.setAttribute(MERGE_MARKER, '1');
    };

    /** Returns whether a group key can identify a row group. */
    const hasGroupKey = (key) => key !== null && key !== undefined
        && (!(typeof key === 'string') || key.trim() !== '');

    /** Resolves a visible column and returns its native cell element. */
    const getCellElement = (gridInstance, rowIndex, dataField) => {
        if (typeof gridInstance.getCellElement !== 'function') {
            throw new TypeError('The grid does not expose getCellElement.');
        }
        let columnIdentifier = dataField;
        if (typeof gridInstance.getVisibleColumnIndex === 'function') {
            const visibleColumnIndex = gridInstance.getVisibleColumnIndex(dataField);
            if (typeof visibleColumnIndex === 'number' && visibleColumnIndex >= 0) {
                columnIdentifier = visibleColumnIndex;
            }
        }
        return toNativeElement(gridInstance.getCellElement(rowIndex, columnIdentifier));
    };

    /** Collects consecutive eligible groups in the order currently displayed. */
    const collectGroups = (gridInstance, options) => {
        if (typeof gridInstance.getVisibleRows !== 'function') {
            throw new TypeError('The grid does not expose getVisibleRows.');
        }
        const visibleRows = gridInstance.getVisibleRows() || [];
        const groups = [];
        let currentGroup = null;
        const closeGroup = () => {
            if (currentGroup && currentGroup.rows.length > 1) {
                groups.push(currentGroup);
            }
            currentGroup = null;
        };

        visibleRows.forEach((visibleRow) => {
            if (!visibleRow || visibleRow.rowType !== 'data') {
                closeGroup();
                return;
            }
            const key = options.getGroupKey(visibleRow);
            if (!hasGroupKey(key)) {
                closeGroup();
                return;
            }
            const cells = options.targetDataFields.map(dataField => getCellElement(
                gridInstance, visibleRow.rowIndex, dataField));
            if (cells.some(cell => !cell)) {
                closeGroup();
                return;
            }
            if (currentGroup && currentGroup.key === key) {
                currentGroup.rows.push({visibleRow, cells});
                return;
            }
            closeGroup();
            currentGroup = {key, rows: [{visibleRow, cells}]};
        });
        closeGroup();
        return groups;
    };

    /** Applies one row span group to every configured target column. */
    const applyGroup = (group) => {
        const groupSize = group.rows.length;
        group.rows[0].cells.forEach((cell) => {
            markCell(cell);
            cell.rowSpan = groupSize;
            cell.style.verticalAlign = 'middle';
        });
        group.rows.slice(1).forEach((row) => {
            row.cells.forEach((cell) => {
                markCell(cell);
                cell.style.display = 'none';
                cell.setAttribute('aria-hidden', 'true');
            });
        });
    };

    /**
     * Merges configured cells for consecutive groups in the current grid view.
     * @param {Object} gridInstance DevExtreme DataGrid instance.
     * @param {Object} options Merge configuration.
     * @param {Array<string>} options.targetDataFields Target data fields.
     * @param {Function} options.getGroupKey Returns the visible-row group key.
     * @returns {void}
     */
    const mergeVisibleRowsByKey = (gridInstance, options = {}) => {
        const root = getGridRoot(gridInstance);
        resetMarkedCells(root);
        try {
            if (!Array.isArray(options.targetDataFields)
                || options.targetDataFields.length === 0
                || options.targetDataFields.some(field => typeof field !== 'string' || field === '')) {
                throw new TypeError('targetDataFields must contain one or more data fields.');
            }
            const uniqueFields = new Set(options.targetDataFields);
            if (uniqueFields.size !== options.targetDataFields.length) {
                throw new TypeError('targetDataFields must not contain duplicates.');
            }
            if (typeof options.getGroupKey !== 'function') {
                throw new TypeError('getGroupKey must be a function.');
            }
            collectGroups(gridInstance, options).forEach(applyGroup);
        } catch (error) {
            resetMarkedCells(root);
            throw error;
        }
    };

    return {mergeVisibleRowsByKey};
});
