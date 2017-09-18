/**
 * @properties={typeid:24,uuid:"AE08FCFB-7052-4D97-82A7-B49E2E6A2CDA"}
 */
	function GroupHashCache() {

		// private properties
		var hashTree = new Object(); // the foundsetRef mapping

		// methods
		this.getCachedFoundset;
		this.setCachedFoundset;
		this.clearAll;
		this.removeCachedFoundset;
		this.removeCachedFoundsetAtLevel;
		this.removeChildFoundsets;

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
		 * @param {String} foundsetUUID
		 * Remove the node */
		this.removeCachedFoundset = function(foundsetUUID) {
			return removeFoundset(hashTree, foundsetUUID);
		}

		/**
		 * @param {Number} level
		 * Remove the node */
		this.removeCachedFoundsetAtLevel = function(level) {
			return removeFoundset(hashTree, null, level);
		}

		/** Remove all it's child node */
		this.removeChildFoundset = function(foundsetUUID, field, value) {
			return removeChildFoundsets(hashTree, foundsetUUID, field, value);
		}

		this.clearAll = function() {
			for (var nodeKey in hashTree) {
				var node = hashTree[nodeKey];
				if (node.foundsetUUID) {
					removeFoundset(hashTree, node.foundsetUUID);
				} else {
					// TODO is it this possible
					$log.error('There is a root node without a foundset UUID, it should not happen');
				}
			}
			if ($scope.model.hashedFoundsets.length > 0) {
				$log.error("Clear All was not successful, please debug");
			}
		}

		function removeFoundset(tree, foundsetUUID, level) {
			if (!tree) {
				return true;
			}

			if (!foundsetUUID && level === undefined) {
				return true;
			}

			for (var nodeKey in tree) {
				var subNodeKey
				var node = tree[nodeKey];

				// remove the foundset and all it's child nodes if foundsetUUID or level === 0
				if ( (foundsetUUID && node.foundsetUUID === foundsetUUID) || (level === 0)) {
					// TODO should delete all subnodes

					if (node.nodes) {
						for (subNodeKey in node.nodes) {
							removeFoundset(node.nodes, node.nodes[subNodeKey].foundsetUUID);
						}
					}
					
					// do nothing if the foundset doesn't exist
					if (node.foundsetUUID) {
					// TODO should this method access the foundsetManager ? is not a good encapsulation
						var foundsetManager = getFoundsetManagerByFoundsetUUID(node.foundsetUUID);
						foundsetManager.destroy();
					}
					delete tree[nodeKey];
					return true;
				} else if (node.nodes) {
					for (subNodeKey in node.nodes) {
						// if level, remove one item to level ( 0 is root )
						if (removeFoundset(node.nodes, foundsetUUID, level ? level - 1 : undefined)) {
							return true;
						}
					}
				}
			}
			return false;
		}

		function removeChildFoundsets(tree, foundsetUUID, field, value) {
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
							var childFoundsetUUID = node.nodes[subNodeKey].foundsetUUID;
							var foundsetRef = getFoundsetManagerByFoundsetUUID(childFoundsetUUID);
							// FIXME this solution is horrible, can break if rows.length === 0 or...
							// A better solution is to retrieve the proper childFoundsetUUID by rowGroupCols/groupKeys
							if (foundsetRef && ( (field === null || field === undefined) || (field !== null && field !== undefined && foundsetRef.foundset.viewPort.rows[0] && foundsetRef.foundset.viewPort.rows[0][field] == value))) {
								success = (removeFoundset(node.nodes, childFoundsetUUID) && success);
							} else {
								$log.debug('ignore the child foundset');
							}
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
				//							$log.warn('discard row groups ' + (rowGroupCols.length - groupKeys.length));
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
 * @properties={typeid:35,uuid:"D3E7564F-71F2-4B80-85B0-CAB98625744E",variableType:-4}
 */
var $log = {
		debug: function(msg) {
			application.output(msg);
		},
		warn: function (msg) {
			application.output(msg, LOGGINGLEVEL.WARNING);
		},
		error: function (msg) {
			application.output(msg, LOGGINGLEVEL.ERROR);
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
		},
		foundset: {
			viewPort: {
				rows: [],
				size: 0,
				startIndex: 0
			}
		}
	}
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
		field: "customerid",
		id: "customerid"
	}];

	groupKeys = ['ALFKI'];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
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
 * @properties={typeid:24,uuid:"6C91A595-CAC9-46FB-8080-D8BCDA9B8979"}
 */
function test_setCachedFoundset() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
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
		field: "customerid",
		id: "customerid"
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
		field: "customerid",
		id: "customerid"
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
 * @properties={typeid:24,uuid:"6AA5529D-FB30-4A45-B310-0AB8F9174457"}
 */
function test_setCachedFoundsetAtdeepLevel() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, null);
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));

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
		field: "customerid",
		id: "customerid"
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
		field: "customerid",
		id: "customerid"
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
	cache.setCachedFoundset(rowGroupCols, groupKeys, null);
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));

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
 * @deprecated 
 * @properties={typeid:24,uuid:"48C46FBD-0324-4C8C-ACDC-586517F9CD38"}
 */
function test_updateCachedFoundset() {
	return;
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols,groupKeys,'u-customerid');
	jsunit.assertEquals('u-customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols,groupKeys,'u-customerid-ALFKI');
	jsunit.assertEquals('u-customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ANTON"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ANTON');
	jsunit.assertEquals('customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ANTON');
	jsunit.assertEquals('u-customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	jsunit.assertEquals('u-customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "B905CBA4-shipcity",
		id: "B905CBA4-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI-shipcity');
	jsunit.assertEquals('u-customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('u-customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));
	
	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('u-customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));
	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
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
 * @properties={typeid:24,uuid:"D8F57320-D703-458F-B683-BA60BB717D55"}
 */
function test_removeCachedFoundset() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
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
		field: "customerid",
		id: "customerid"
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
		field: "customerid",
		id: "customerid"
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
		field: "customerid",
		id: "customerid"
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
		field: "customerid",
		id: "customerid"
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
	jsunit.assertEquals(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"]), null); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
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


/**
 * @properties={typeid:24,uuid:"EB3D7573-7FDE-427B-8991-8158A575461C"}
 */
function test_removeCachedFoundsetAtLevel() {
	
	var cache;
	var rowGroupCols
	var groupKeys;
	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
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
	
	cache.removeCachedFoundsetAtLevel(1);
	
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols,groupKeys));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ['ALFKI']));
	jsunit.assertNotNull(cache.getCachedFoundset([rowGroupCols][0], []));
	jsunit.assertNull(cache.getCachedFoundset([rowGroupCols[0]], ['ALFKI']));
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupCols, []));


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
