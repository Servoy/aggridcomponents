/**
 * @properties={typeid:24,uuid:"AE08FCFB-7052-4D97-82A7-B49E2E6A2CDA"}
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

	/** Remove the node */
	this.removeCachedFoundset = function(foundsetUUID) {
		return removeFoundset(hashTree, foundsetUUID);
	}

	/** Remove all it's child node */
	this.removeChildFoundset = function(foundsetUUID) {
		return removeChildFoundsets(hashTree, foundsetUUID);
	}

	function removeFoundset(tree, foundsetUUID) {
		if (!tree) {
			return true;
		}

		if (!foundsetUUID) {
			return true;
		}

		for (var nodeKey in tree) {
			var subNodeKey
			var node = tree[nodeKey];
			if (node.foundsetUUID === foundsetUUID) {
				// TODO should delete all subnodes

				if (node.nodes) {
					for (subNodeKey in node.nodes) {
						removeFoundset(node.nodes, node.nodes[subNodeKey].foundsetUUID);
					}
				}
				// TODO should this method access the foundsetManager ? is not a good encapsulation
				var foundsetManager = getFoundsetManagerByFoundsetUUID(foundsetUUID);
				foundsetManager.destroy();
				delete tree[nodeKey];
				return true;
			} else if (node.nodes) {
				for (subNodeKey in node.nodes) {
					if (removeFoundset(node.nodes, foundsetUUID)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	function removeChildFoundsets(tree, foundsetUUID) {
		if (!tree) {
			return false;
		}

		if (!foundsetUUID) {
			return false;
		}

		for (var nodeKey in tree) {
			var subNodeKey
			var node = tree[nodeKey];
			if (node.foundsetUUID === foundsetUUID) {
				// delete all subnodes
				var success = true;
				if (node.nodes) {
					for (subNodeKey in node.nodes) {
						success = (removeFoundset(node.nodes, node.nodes[subNodeKey].foundsetUUID) && success);
					}
				}
				return success;
			} else if (node.nodes) { // search in subnodes
				for (subNodeKey in node.nodes) {
					if (removeChildFoundsets(node.nodes, foundsetUUID)) {
						return true;
					}
				}
			}
		}
		return false;
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
		} else if (!colTree) { // or return null
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
						nodes: new Object()
					}
					colTree.nodes[key] = keyTree;
				} else if (!keyTree) { // or return null
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
						nodes: new Object()
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
 * @param foundsetUUID
 *
 * @properties={typeid:24,uuid:"AEC3A4BD-169C-460F-A4A0-5D27FBD9BFEB"}
 */
function getFoundsetManagerByFoundsetUUID(foundsetUUID) {
	return {
		destroy: function() {
			application.output('Destroy ' + foundsetUUID)
		}
	}
}

/**
 * @properties={typeid:24,uuid:"6C91A595-CAC9-46FB-8080-D8BCDA9B8979"}
 */
function test_setCachedFoundset() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
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
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

}

/**
 * @properties={typeid:24,uuid:"5162040D-6DAC-4209-957E-C6C2CB075183"}
 */
function test_getCachedFoundset() {

	var groupKeys = [];
	var rowGroupCols = [];

	var cache = new GroupHashCache();

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}];

	groupKeys = ['ALFKI'];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	groupKeys = ['ALFKI'];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

}

/**
 * @properties={typeid:24,uuid:"D8F57320-D703-458F-B683-BA60BB717D55"}
 */
function test_removeCachedFoundset() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
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
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// remove the keys
	jsunit.assertTrue(cache.removeCachedFoundset('customerid-ALFKI-shipcity-Athens')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys)); // check other id still exists

	// remove the keys
	jsunit.assertTrue(cache.removeCachedFoundset('customerid-ALFKI-shipcity')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// remove the keys
	jsunit.assertTrue(cache.removeCachedFoundset('customerid')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI"])); // check id not there

}

/**
 * @properties={typeid:24,uuid:"5F43049D-9818-4292-9E1A-757F014409F6"}
 */
function test_removeChildFoundsets() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
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
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// remove the keys
	jsunit.assertTrue(cache.removeChildFoundset('customerid-ALFKI-shipcity-Athens')); // remove id
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check other id still exists
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// remove the keys
	jsunit.assertTrue(cache.removeChildFoundset('customerid-ALFKI-shipcity')); // remove id
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, ["ALFKI"])); // check other id still exists
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "B905CBA4-73E2-4317-BE36-48E8E08337E1",
		id: "B905CBA4-73E2-4317-BE36-48E8E08337E1"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	cache.setCachedFoundset([rowGroupCols[0]], groupKeys, 'customerid-ALFKI');
	
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// remove the keys
	jsunit.assertTrue(cache.removeChildFoundset('customerid')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI"])); // check id not there

}

/*
 *
 select min(orderid) from orders where customerid = 'ALFKI' group by shipcity order by shipcity;

 update orders set shipcountry = 'Greece' where shipcity = 'Athens' or shipcity = 'Thessaloniki';

 select * from orders where customerid = 'ALFKI' order by shipcity ;

 update orders set shipcountry = 'Spain' where shipcity = 'Barcelona' or shipcity = 'Madrid';

 update orders set shipcountry = 'Italy' where shipcity = 'Rome' or shipcity = 'Milan';

 update orders set shipcountry = 'Norway' where shipcity = 'Oslo';

 update orders set shipcountry = 'Netherlands' where shipcity = 'Amsterdam';

 update orders set shipcountry = 'France' where shipcity = 'Paris';

 select * from orders where customerid = 'ALFKI' AND shipcity = 'Madrid'

 */
