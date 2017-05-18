/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"279174F8-75BB-43AD-9943-E3865908048E",variableType:8}
 */
var pageCount

/**
 * @type {scopes.svyDataset.DataSetManager}
 *
 * @properties={typeid:35,uuid:"289FE5BB-4653-4C03-9B50-51E80F15F321",variableType:-4}
 */
var datasetManager;

/**
 * Callback method when form is (re)loaded.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"750DCE9B-EFBB-484E-9341-DC26ABA8A0BE"}
 */
function onLoad(event) {
	datasetManager = new scopes.svyDataset.DataSetManager(foundset.getQuery());
}

/**
 * Callback method for when form is shown.
 *
 * @param {Boolean} firstShow form is shown first time after load
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"20C11138-EBF9-4718-978A-69644EA2CB9F"}
 */
function onShow(firstShow, event) {
	showUIGrid();
	getTableCount();
}

/**
 * @param {Number|String} pk
 * @public 
 * @properties={typeid:24,uuid:"DA91D9B9-ACCF-4D49-85F4-27EC265A59D9"}
 */
function selectRecord(pk) {
	foundset.selectRecord(pk);
}

/**
 * @protected
 * @properties={typeid:24,uuid:"E702E184-7085-44E9-9C28-FDC38DA7FF27"}
 */
function showUIGrid() {
	elements.uigrid.dataset = datasetManager.getDataSet(10);
}

/**
 * @protected
 * @properties={typeid:24,uuid:"84F95655-ECFE-4C73-8546-F1F99AB74548"}
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
 * @properties={typeid:24,uuid:"267551DE-E2DF-473E-962F-46C07E1B29BB"}
 */
function onRowSelected(index, row, event) {
	application.output(index)
	application.output(row)
	application.output(event.getElementName())
}

/**
 * @param {JSEvent} event the event that triggered the action
 * @protected
 *
 * @properties={typeid:24,uuid:"53D39C16-FE56-4DDD-8244-DCA7F9BB79CC"}
 */
function onLoadNext(event) {
	var ds = datasetManager.loadNextChunk();
	elements.uigrid.dataset = ds;

}

/**
 * @param {JSEvent} event
 * @protected
 *
 * @properties={typeid:24,uuid:"650C7AED-CBBC-4C71-B2E6-CE2A7925245B"}
 */
function onLoadPrev(event) {
	var ds = datasetManager.loadPrevChunk();
	elements.uigrid.dataset = ds;
}

