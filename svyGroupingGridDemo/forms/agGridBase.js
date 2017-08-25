/**
 * @type {Number}
 * @protected 
 *
 * @properties={typeid:35,uuid:"BC2F9744-B46F-46A6-AA32-51437F6CAF1B",variableType:8}
 */
var pageCount;

/**
 * Callback method when form is (re)loaded.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"C74BDCB3-103B-4A89-B3B2-8FCAC5A6BAB4"}
 */
function onLoad(event) {
}

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
	showUIGrid();
	getTableCount();
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
 *
 * @protected
 * @properties={typeid:24,uuid:"0F921EDD-F640-45EB-A3DA-65B119A19D4A"}
 */
function showUIGrid() {

	//elements.uigrid.dataset = getDataSet();
}

/**
 * @protected
 *
 * @return {JSDataSet}
 *
 * @properties={typeid:24,uuid:"08E9CFA9-59BB-45A2-9202-83052DD9D62C"}
 */
function getDataSet() {

	var ds;
	if (foundset.getDataSource()) {
		ds = databaseManager.getDataSetByQuery(foundset.getQuery(), -1);
	} else {
		ds = databaseManager.createEmptyDataSet();
	}
	return ds;
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
 * @properties={typeid:24,uuid:"BD7862F9-E1A5-48F3-BB12-AAC5E8EA0B64"}
 */
function emptyDs() {
	var ds = databaseManager.createEmptyDataSet();
	elements.uigrid.dataset = ds;
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
function onNodeExpanded(columnIndex, value) {
	var manager = new scopes.svyDataset.DataSetManager(foundset.getDataSource());
	manager.addResult('customerid');
	manager.addResult('shipcity');
	
	manager.groupValue(1,0);
	var dataset = manager.lookupValue(1,value);
	application.output(dataset.getMaxRowIndex())
	return dataset;
}

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
	// TODO Auto-generated method stub

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
 * Called when the mouse is clicked on a row/cell (foundset and column indexes are given) or.
 * when the ENTER key is used then only the selected foundset index is given
 * Use the record to exactly match where the user clicked on
 *
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {JSRecord} [record]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"A47657E6-14E5-43FA-B763-6AD110004071"}
 */
function onCellClick(foundsetindex, columnindex, record, event) {
	var msg = 'Click ' + foundsetindex + ' - ' + columnindex + ' - ' + (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Click');
}

/**
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {JSRecord} [record]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"739FD949-4F58-4365-808C-B88D6C8CF5DD"}
 */
function onCellDoubleClick(foundsetindex, columnindex, record, event) {
	var msg = 'Double Click ' + foundsetindex + ' - ' + columnindex + ' - ' +  (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Double Click');
}

/**
 * Called when the right mouse button is clicked on a row/cell (foundset and column indexes are given) or.
 * when the ENTER key is used then only the selected foundset index is given
 * Use the record to exactly match where the user clicked on
 *
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {JSRecord} [record]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"058BA194-943F-427D-8652-68DE3624888B"}
 */
function onCellRightClick(foundsetindex, columnindex, record, event) {
	var msg = 'Right Click ' + foundsetindex + ' - ' + columnindex + ' - ' +  (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Right Click');
}

/**
 * Called when a record is selected; to be used when the grid isn't bound to the form's foundset.
 *
 * @param {Number} index
 * @param {JSRecord} [record]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"89348A3A-70DE-40D7-8274-F19C4C4BCEE4"}
 */
function onRecordSelected(index, record, event) {
	var msg = 'Select Record ' + index + ' - ' +  (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Record Selected');
}
