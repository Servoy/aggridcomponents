/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"DA747BB4-19CC-4787-A179-CD9FE0A36641",variableType:8}
 */
var currentPage

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"279174F8-75BB-43AD-9943-E3865908048E",variableType:8}
 */
var pageCount

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"6134CB26-52CA-403E-AE79-F443092455D2",variableType:4}
 */
var pageSize = 200;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"C4B35DCB-8EA5-4E40-B462-114A6A97BB14",variableType:4}
 */
var offset = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"A1149437-BED3-4FFC-ACB9-77F385A023E7",variableType:4}
 */
var pageOffset = 0;

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
	showUIGrid(0);
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
 *
 * @param {Number} offsetDiff
 * @protected
 * @properties={typeid:24,uuid:"E702E184-7085-44E9-9C28-FDC38DA7FF27"}
 */
function showUIGrid(offsetDiff) {
	// update the offset
	if (offsetDiff && ((offsetDiff*pageSize) + offset) > 0 && ((offsetDiff*pageSize) + offset <= pageCount)) {
		offset += offsetDiff*pageSize;
		pageOffset = Math.floor(offset / pageSize);
	}

	var ds = getDataSet(offsetDiff);
	
	currentPage = pageOffset * pageSize + ds.getMaxRowIndex();
	elements.uigrid.dataset = ds;
}

/**
 * @param {Number} tableOffset
 * @protected 
 *
 * @properties={typeid:24,uuid:"447E7D2A-EF96-4E39-B9FE-43946781BC31"}
 */
function getDataSet(tableOffset) {
	var ds = databaseManager.createEmptyDataSet();
	return ds;
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
 * @deprecated 
 * @protected 
 * @param {QBSelect} query
 * @param {Number} diff
 *
 * @properties={typeid:24,uuid:"3E24C19E-8D32-43CD-BCA6-DF32A8809B36"}
 */
function addOffset(query, diff) {
	var row;
	var pk
	var i;
	var pks = databaseManager.getTable(foundset).getRowIdentifierColumnNames();


	// FIXME should not go over max
	// FIXME go previous
	switch (diff) {
	case 1:		
		row = getLastRow();
		var queryFunction = query.getColumn(pks[0]);
		var pkValue = row[pks[0]];
		
		if (pks.length > 1) {	// concatenate the pk to get an unique value well sorted
			queryFunction = queryFunction.cast(QUERY_COLUMN_TYPES.TYPE_TEXT);	// force cast to text
			for (i = 1; i < pks.length; i++) {
				pk = pks[i]
				queryFunction = queryFunction.concat(query.getColumn(pk)).cast(QUERY_COLUMN_TYPES.TYPE_TEXT);
				pkValue += "" + row[pk];
			}
		}
		
		query.where.add(queryFunction.gt(pkValue));
		//query.where.add(query.getColumn(pk).gt(row[pk]));
	case 0: 	// cascate
		query.result.addPk();
		sortPkAsc();
		break;
	case -1:
		row = getFirstRow();
		query.sort.clear();
		for (i = 0; i < pks.length; i++) {
			application.output(row[pk]);
			pk = pks[i]
			query.sort.add(query.getColumn(pk).desc);
			query.where.add(query.getColumn(pk).lt(row[pk]));
		}
		break;
	default:
		break;
	}
	
	function sortPkAsc() {
		query.sort.clear();
		query.sort.addPk();
	}
	
	function sortPkDesc() {
		query.sort.clear();
		for (var j = 0; j < pks.length; j++) {
			query.sort.add(query.getColumn(pks[j]).desc);
		}
	}
	
	
}

/**
 * @deprecated 
 * @properties={typeid:24,uuid:"A706548C-799F-4A42-92D6-75B812BD1B6A"}
 */
function getFirstRow() {
	if (elements.uigrid.dataset) {
		/** @type {JSDataSet} */
		var ds = elements.uigrid.dataset;
		return ds[0];
	}
	return null;
}

/**
 * @deprecated 
 * @properties={typeid:24,uuid:"6A9F3A59-F287-4C03-94DF-63928C37B794"}
 */
function getLastRow() {
	if (elements.uigrid.dataset) {
		/** @type {JSDataSet} */
		var ds = elements.uigrid.dataset;
		return ds[ds.getMaxRowIndex()-1];
	}
	return null;
}

/**
 * @properties={typeid:24,uuid:"99DC7522-E356-4195-B2D1-35DFD1E5EC0D"}
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
	//showUIGrid(1);
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
	//showUIGrid(-1);
	elements.uigrid.dataset = ds;

}

