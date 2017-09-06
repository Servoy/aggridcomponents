/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"79E24181-DE9E-4A72-96D1-342786DD64D9",variableType:8}
 */
var searchProductId;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"3742151D-2759-4DAC-8C9C-7D9C32158411"}
 */
var searchText;

/**
 * @param {JSEvent} event
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"FD98E513-5921-4CE2-AB4F-D67CC3035178"}
 */
function onActionNext(event) {
	foundset.setSelectedIndex(foundset.getSelectedIndex() + 1)	
}

/**
 * TODO generated, please specify type and doc for the params
 * @param event
 *
 * @properties={typeid:24,uuid:"D1D08995-613A-485B-B00F-C42F0B889C85"}
 */
function onActionPrev(event) {
	foundset.setSelectedIndex(foundset.getSelectedIndex() - 1);
}

/**
 * @param {JSEvent} event
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"699DB6D4-4F49-4543-892D-5F05A30EC879"}
 */
function onGoTo2000(event) {
	foundset.getRecord(2000);
	foundset.setSelectedIndex(2000);

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
 * @properties={typeid:24,uuid:"027C9EF7-B271-431A-9142-2DD3148CFB54"}
 */
function onCellClick(foundsetindex, columnindex, record, event) {
	var msg = 'Click ' + foundsetindex + ' - ' + columnindex + ' - ' + (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Click');
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
 * @properties={typeid:24,uuid:"2106ADF3-CD30-486E-BAB9-87D134782FB5"}
 */
function onRecordSelected(index, record, event) {
	var msg = 'Select Record ' + index + ' - ' +  (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Record Selected');
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
 * @properties={typeid:24,uuid:"AFD35F81-A77E-432B-B979-1DF3D36A80E4"}
 */
function onCellRightClick(foundsetindex, columnindex, record, event) {

	var msg = 'Right Click ' + foundsetindex + ' - ' + columnindex + ' - ' +  (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Right Click');
}

/**
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {JSRecord} [record]
 * @param {JSEvent} [event]
 *
 * @properties={typeid:24,uuid:"CBE46A4D-E240-45DE-895E-170A7E3D5B94"}
 */
function onCellDoubleClick(foundsetindex, columnindex, record, event) {
	var msg = 'Double Click ' + foundsetindex + ' - ' + columnindex + ' - ' +  (record ? record.orderid : ' undefined ' ) + ' - ' + event.getElementName();
	logMsg(msg,'Double Click');
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"8D5C3339-9E5C-48C7-BBE4-4FD6A6699D72"}
 */
function onHideColumn(event) {
	var column = elements.groupingtable.columns[2];
	column.visible = !column.visible;
}

/**
 * @param event
 *
 * @properties={typeid:24,uuid:"33A12F6D-7017-49DF-AE91-E1B3254E9C70"}
 */
function toggleVisibility(event) {
	elements.groupingtable.visible = !elements.groupingtable.visible;
}

/**
 * @param msg
 * @param title
 *
 * @properties={typeid:24,uuid:"A5A431C3-05D1-41EB-ABE7-10C7FFAA1608"}
 */
function logMsg(msg, title) {
	application.output(msg);
	plugins.webnotificationsToastr.info(msg, title);
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"BB3FB189-8EC6-4D92-8DF6-357FAF341E7B"}
 */
function onFindAndSearch(event) {
	search(event, foundset);
}

/**
 * @properties={typeid:24,uuid:"A7092EC3-8B9F-4775-A75D-FDCC23C8D4E2"}
 * @AllowToRunInFind
 */
function search(event, fs) {
	if (!fs) fs = foundset.duplicateFoundSet()
	if (fs.find()) {
		if(searchText) fs.orderid = searchText;
		if(searchProductId) fs.productid = searchProductId;
		fs.search();
		foundset.loadRecords(fs);
	} else {
		plugins.webnotificationsToastr.error("can't search because there are edited records")
	}
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"842C05E7-8441-4555-8274-2596EC9B0DA5"}
 */
function onResetSearch(event) {
	searchProductId = null;
	searchText = null;
	foundset.loadAllRecords();
}


