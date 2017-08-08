/**
 * @properties={typeid:24,uuid:"BD00A3E1-55C2-4CB6-9D79-AB040C24879F"}
 */
function GroupHashCache() {

	// private properties
	var hashTree = new Object(); // the foundsetRef mapping

	// methods
	this.getCachedFoundset;
	this.setCachedFoundset;

	this.getCachedFoundset = function(rowGroupCols, groupKeys) {

		var tree = hashTree;
		var node = getTreeNode(tree, rowGroupCols, groupKeys);
		return node ? node.foundsetUUID : null;
		

		//						for (var colIdx = 0; colIdx < rowGroupCols.length; colIdx++) {
		//							var columnId = rowGroupCols[colIdx].field;
		//							if (colIdx === groupKeys.length -2 ) {	// last node is not a leaf
		//								parentTree = parentTree[columnId];
		//							} else {	//
		//								if (parentTree[columnId]) {
		//									parentTree = parentTree[columnId].nodes;
		//								} else {
		//									return null;
		//								}
		//							}
		//						}
		//
		//						if (parentTree) {
		//							return parentTree.foundsetUUID;
		//						}
		//
	}

	this.setCachedFoundset = function(rowGroupCols, groupKeys, foundsetUUID) {
		var tree = getTreeNode(hashTree, rowGroupCols, groupKeys, true);
		tree.foundsetUUID = foundsetUUID;
	}

	/**
	 * @param {Object} tree
	 * @param {Array} rowGroupCols
	 * @param {Array} groupKeys
	 * @param {Boolean} [create]
	 *
	 * */
	function getTreeNode(tree, rowGroupCols, groupKeys, create) {
		
		var result = null;
		
		if (rowGroupCols.length > groupKeys.length + 1) {
//			$log.warn('discard row groups ' + (rowGroupCols.length - groupKeys.length));
			rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);
		}

		/*
		 * {
		 * 	columnId {
		 * 		foundsetUUID: uuid
		 * 		nodes: {
		 * 			keyValue : {
		 * 				foundsetUUID : uuid
		 * 				nodes : {
		 * 					subColumnId { ... }
		 * 				}
		 * 			},
		 * 			keyValue2 : { ... }
		 * 		}
		 * 	  }
		 * }
		 *
		 *
		 * */

		if (!tree) {
			return null;
		}
		
		// the column id e.g. customerid, shipcity
		var columnId = rowGroupCols[0].field;
		
		// the tree for the given column
		var colTree = tree[columnId];
		
		// create the tree node if does not exist
		if (!colTree && create) {
			colTree = {
				nodes: { },
				foundsetUUID: null
			};
			tree[columnId] = colTree;
		} else if (!colTree) {	// or return null
			return null;
		}

		if (rowGroupCols.length === 1) { // the last group
	
			if (groupKeys.length === 0) { // is a leaf child
				result = colTree;
			} else if (groupKeys.length === 1) { // is a leaf child

				// get the subtree matching the rowGroupCols
				var key = groupKeys[0];
				var keyTree = colTree.nodes[key];
				
				// create the key tree node if does not exist
				if (!keyTree && create) {
					keyTree = {
						foundsetUUID: null,
						nodes : new Object()
					}
					colTree.nodes[key] = keyTree;
				} else if (!keyTree) {	// or return null
					return null;
				}
				
				result = keyTree;
				
			} else { // no group key criteria
				$log.warn("this should not happen");
			}

		} else if (rowGroupCols.length > 1) { // is not the last group
			var key = groupKeys.length ? groupKeys[0] : null;

			if (!colTree) {
				$log.warn("this should not happen")
				return null;
			}
			
			var subTree = colTree;

			if (key !== null) {
				var keyTree = colTree.nodes[key];
				
				// create the key tree node if does not exist
				if (!keyTree && create) {
					keyTree = {
						foundsetUUID: null,
						nodes : new Object()
					}
					colTree.nodes[key] = keyTree;
				} else if (!keyTree) {
					return null;
				}
				
				subTree = keyTree;
				
			} else {
				// if is not the last group, should always have a key criteria
				$log.warn("this should not happen")
			}

			rowGroupCols = rowGroupCols.slice(1);
			groupKeys = groupKeys.slice(1);
			
			result = getTreeNode(subTree.nodes, rowGroupCols, groupKeys, create);

		} else {
			$log.warn("No group criteria, should not happen");
		}
		
		return result;
	}
	
}


/**
 * @properties={typeid:24,uuid:"A58BEABA-E93B-4450-824E-E6BBEFAAB99F"}
 */
function test_setCachedFoundset() {
	var groupKeys = [];
	var rowGroupCols = [];
	
	rowGroupCols = [{
		aggFunc: undefined,
	    displayName :"customerid",
	    field : "B905CBA4-73E2-4317-BE36-48E8E08337E1",
	    id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}];
	
	var cache = new GroupHashCache();
	
	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	// top level, expand a leaf node
	groupKeys = ["ANTON"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ANTON');
	jsunit.assertEquals('customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI"];
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
	    displayName :"customerid",
	    field : "B905CBA4-73E2-4317-BE36-48E8E08337E1",
	    id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	},{
		aggFunc: undefined,
	    displayName :"shipcity",
	    field : "B905CBA4-shipcity",
	    id: "B905CBA4-shipcity"
	}];
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI", "Athens"];
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI", "Amsterdam"];
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	// second test
	
	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
	    displayName :"customerid",
	    field : "B905CBA4-73E2-4317-BE36-48E8E08337E1",
	    id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	},{
		aggFunc: undefined,
	    displayName :"shipcity",
	    field : "B905CBA4-shipcity",
	    id: "B905CBA4-shipcity"
	}];
	
	groupKeys = [];
	
	// new object
	cache = new GroupHashCache();
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI"];
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI", "Athens"];
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI", "Amsterdam"];
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols,groupKeys,'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
}

/**
 * @properties={typeid:24,uuid:"4DA4D327-DE76-474A-A3C4-C0059E4C8AD7"}
 */
function atest_getCachedFoundset() {
	
	
}