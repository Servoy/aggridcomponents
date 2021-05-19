/**
 * @type {Number}
 * @protected
 *
 * @properties={typeid:35,uuid:"BC2F9744-B46F-46A6-AA32-51437F6CAF1B",variableType:8}
 */
var pageCount;

/**
 * @type {Number}
 * @protected 
 *
 * @properties={typeid:35,uuid:"B2FCA001-3FB1-4034-BD93-E9BB2B686067",variableType:4}
 */
var foundsetIndex;

/**
 * Callback method when form is (re)loaded.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"C74BDCB3-103B-4A89-B3B2-8FCAC5A6BAB4"}
 */
function onLoad(event) { }

/**
 * Callback method for when form is shown.
 *
 * @param {Boolean} firstShow form is shown first time after load
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"D41C5C30-6545-4D3F-BC24-C135EDFE6B0E"}
 */
function onShow(firstShow, event) {
	getTableCount();
	elements.groupingtable_1.requestFocus(0);
}

/**
 * Handle hide window.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @return {Boolean}
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"79D05AF4-B8D3-4726-B0D4-4FE35C80519A"}
 */
function onHide(event) {
	return true;
}

/**
 * @param {Number|String} pk
 * @public
 * @properties={typeid:24,uuid:"4533255E-7FF7-4DB4-8E11-7A21356A6F52"}
 */
function selectRecord(pk) {
	foundset.selectRecord(pk);
}

/**
 * @protected
 * @properties={typeid:24,uuid:"34D802FA-6FB7-4DB4-837C-A6DF9DB18C64"}
 */
function getTableCount() {
	var pks = databaseManager.getTable(foundset).getRowIdentifierColumnNames();

	var q = foundset.getQuery();
	q.result.clear();
	q.result.add(q.getColumn(pks[0]).count);
	q.sort.clear();

	var ds = databaseManager.getDataSetByQuery(q, 1);
	pageCount = ds.getValue(1, 1);
	return pageCount;
}

/**
 * Called when a row is selected.
 *
 * @param {Number} index
 * @param {object} [row]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"8F51B145-1253-4D02-8F33-69DC9CCBC14A"}
 */
function onRowSelected(index, row, event) {
	application.output(index)
	application.output(row)
	application.output(event.getElementName())
}

/**
 * @param {Number} columnIndex
 * @param {string} value
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"320459DA-340E-436A-948A-01EB07AB20EE"}
 */
function onNodeExpanded(columnIndex, value) { }

/**
 * @param {Number} columnIndex
 * @param {Number} groupIndex
 * @param {boolean} isGrouped
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"8B55B361-0A80-4B45-88DD-7D671CF1D665"}
 */
function onGroupChanged(columnIndex, groupIndex, isGrouped) {

}

/**
 * @param msg
 * @param title
 *
 * @properties={typeid:24,uuid:"94D21748-FA04-4C31-BC70-B3BCA4D137B3"}
 */
function logMsg(msg, title) {
	application.output(msg);
}

/**
 * Called when the mouse is clicked on a row/cell (foundset and column indexes are given) 
 *
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {Object} [record]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"A47657E6-14E5-43FA-B763-6AD110004071"}
 */
function onCellClick(foundsetindex, columnindex, record, event) {
	if (foundsetindex === -1) {
		
	} else {
		foundsetIndex = foundsetIndex;
	}

	var msg = 'Click ' + foundsetindex + ' - ' + columnindex  + ' - ' + event.getElementName();
	logMsg(msg, 'Click');
}

/**
 * Called when the right mouse button is clicked on a row/cell (foundset and column indexes are given) or.
 * when the ENTER key is used then only the selected foundset index is given
 * Use the record to exactly match where the user clicked on
 *
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {Object} [record]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"058BA194-943F-427D-8652-68DE3624888B"}
 */
function onCellRightClick(foundsetindex, columnindex, record, event) {
	var msg = 'Right Click ' + foundsetindex + ' - ' + columnindex + ' - ' + event.getElementName();
	logMsg(msg, 'Right Click');
}

/**
 * @param {JSEvent} event
 * @protected
 *
 * @properties={typeid:24,uuid:"F0A998FD-A8E9-46E9-BEE1-3BF2DCFB29C3"}
 */
function onNewRecord(event) {
	var index = foundsetIndex ? foundsetIndex : null;
	logMsg(foundset.newRecord(index), 'index');
}

/**
 * @param {JSEvent} event
 * @protected
 *
 * @properties={typeid:24,uuid:"71639D4A-AA54-4593-B608-6033DBD54A88"}
 */
function onDeleteRecord(event) {
	var index = foundsetIndex ? foundsetIndex : null;
	foundset.deleteRecord(index);
}

/**
 * @param {JSEvent} event
 * @protected 
 *
 * @properties={typeid:24,uuid:"9840890B-5994-4876-81E9-F0547584FFA8"}
 */
function onGotoIndex(event) {
	foundset.setSelectedIndex(foundsetIndex);
}

/**
 * 
 * @param {JSEvent} event
 * @protected
 *  
 * @properties={typeid:24,uuid:"A6441F31-8C2F-433C-9648-7A194DDB5BA4"}
 */
function onActionSort(event) { }

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"0FD08778-5C08-4926-9AB1-6E45A9694EF3"}
 */
function onAutosaveToggle(event) {
	databaseManager.setAutoSave(!databaseManager.getAutoSave());
	var acquireLock = false;
	if (!databaseManager.getAutoSave() && foundset.getSelectedRecord()) {
		// lock record before saving
		acquireLock = databaseManager.acquireLock(foundset, foundset.getSelectedIndex(), 'mylock')
	}
	databaseManager.saveData();
	if (acquireLock) {
		databaseManager.releaseAllLocks('mylock');
	}
	updateUI();
}

/**
 * Perform the element onclick action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"DADDB95B-44BE-4AD4-A06E-654CE00080ED"}
 */
function onLock(event) {
	if (!foundset.getSelectedRecord()) return;
	
	if (databaseManager.hasLocks('recordLock')) {
		if (databaseManager.releaseAllLocks('recordLock')) {
			databaseManager.saveData();
			databaseManager.setAutoSave(true);
		}
	} else {
		if (databaseManager.acquireLock(foundset, foundset.getSelectedIndex(), 'recordLock')) {
			databaseManager.setAutoSave(false);
		}
	}
	updateUI();
}


/**
 * @protected 
 * @properties={typeid:24,uuid:"AB580C79-2A13-45A2-BB7D-D7D68B9D180B"}
 */
function updateUI() {
	if (databaseManager.hasLocks('recordLock')) {
		elements.btnAutosave.enabled = false;
		elements.btnLock.removeStyleClass("btn-warning");
		elements.btnLock.addStyleClass("btn-success");
	} else {
		elements.btnAutosave.enabled = true;
		elements.btnLock.removeStyleClass("btn-success");
		elements.btnLock.addStyleClass("btn-warning");
	}
	
	if (databaseManager.getAutoSave()) {
		elements.btnAutosave.removeStyleClass("btn-default");
		elements.btnAutosave.addStyleClass("btn-success");

	} else {
		elements.btnAutosave.removeStyleClass("btn-success");
		elements.btnAutosave.addStyleClass("btn-default");
	}
}

/**
 * Called when the mouse is clicked on a row/cell (foundset and column indexes are given).
 * the foundsetindex is always -1 when there are grouped rows
 * the record is not an actual JSRecord but an object having the dataprovider values of the clicked record
 *
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {object} [record]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"AEB2C27E-F963-4544-A74C-D638B5B19164"}
 */
function onCellDoubleClick(foundsetindex, columnindex, record, event) {
	var msg = 'Double Click ' + foundsetindex + ' - ' + columnindex + ' - ' + event.getElementName();
	logMsg(msg, 'Double Click');
}