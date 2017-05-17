/**
 * Callback method when form is (re)loaded.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"FD2B79E7-C023-4516-A0A5-35AFE9238660"}
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
 * @properties={typeid:24,uuid:"9BADD431-5705-4103-961D-951C27635618"}
 */
function onShow(firstShow, event) {
	showUIGrid();
	getTableCount();
}

/**
 * @param {Number|String} pk
 * @public
 * @properties={typeid:24,uuid:"0862C0F8-7BB1-4260-B420-28847FCF2335"}
 */
function selectRecord(pk) {
	foundset.selectRecord(pk);
}

/**
 *
 * @protected
 * @properties={typeid:24,uuid:"D51063A4-564D-46F4-9709-A5F5B648B3A0"}
 */
function showUIGrid() {

	elements.uigrid.dataset = getDataSet();
}

/**
 * @protected
 *
 * @return {JSDataSet}
 *
 * @properties={typeid:24,uuid:"E068FE59-5B4D-4265-9BE0-8CD3C44B0989"}
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
 * @properties={typeid:24,uuid:"B12811CB-6C60-425D-AF60-49BF76EDE4DC"}
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
 * @properties={typeid:24,uuid:"0DF43F12-9667-42AC-9F0E-22F50FA4FD6F"}
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
 * @properties={typeid:24,uuid:"DC7958EA-A5D2-4ACF-91F5-B7305DEFCD68"}
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
 * @properties={typeid:24,uuid:"A70C5A8E-8B9D-4CA9-93A7-1A9BA684F813"}
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
 * @properties={typeid:24,uuid:"3E26DC56-2AE2-4994-B83E-4C5145BCBC30"}
 */
function onGroupChanged(columnIndex, groupIndex, isGrouped) {
	// TODO Auto-generated method stub

}
