/**
 * @type {Number}
 * @protected 
 *
 * @properties={typeid:35,uuid:"130F5EAE-463E-4CE7-B742-16FE633670AF",variableType:8}
 */
var pageCount;

/**
 * Callback method when form is (re)loaded.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"8D75B150-C4D9-47E1-9DDC-BFD1424592D0"}
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
 * @properties={typeid:24,uuid:"59B058C7-923B-48FC-A173-ED089E172D8F"}
 */
function onShow(firstShow, event) {
	showUIGrid();
	getTableCount();
}

/**
 * @param {Number|String} pk
 * @public
 * @properties={typeid:24,uuid:"AD2E3DD7-8CC1-4C4F-8158-3A973C5C759A"}
 */
function selectRecord(pk) {
	foundset.selectRecord(pk);
}

/**
 *
 * @protected
 * @properties={typeid:24,uuid:"53D90D8C-AD26-4536-8A12-92D0B35C0EFA"}
 */
function showUIGrid() {

	//elements.uigrid.dataset = getDataSet();
}

/**
 * @protected
 *
 * @return {JSDataSet}
 *
 * @properties={typeid:24,uuid:"121C3788-080E-465E-947E-40CED04A2E93"}
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
 * @properties={typeid:24,uuid:"7D6082D4-368D-4E93-9778-38CF83158F7B"}
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
 * @properties={typeid:24,uuid:"A239A6C3-52E2-48EC-B463-674198BCC025"}
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
 * @properties={typeid:24,uuid:"F4040806-07E3-44AD-B576-471AFFF7B170"}
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
 * @properties={typeid:24,uuid:"3A51E736-0073-4F0A-8BFF-E2C6702DE95A"}
 */
function onNodeExpanded(columnIndex, value) {
	// TODO Auto-generated method stub

}

/**
 * @param {Number} columnIndex
 * @param {Number} groupIndex
 * @param {boolean} isGrouped
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"37975B42-0B0F-48B8-8678-176283DD38B9"}
 */
function onGroupChanged(columnIndex, groupIndex, isGrouped) {
	// TODO Auto-generated method stub

}
