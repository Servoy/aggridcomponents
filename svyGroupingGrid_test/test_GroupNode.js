/**
 * @public 
 * @constructor
 *
 * @properties={typeid:24,uuid:"05DF6BE8-9FD0-4485-AC89-A988D6F1B397"}
 */
function GroupNode(id) {
	this.foundsetUUID;
	this.id = id;
	this.nodes = new Object();

	/**
	 * @public
	 * @param {Function} callback execute function for each subnode. Arguments GroupNode
	 *  */
	this.forEach = function(callback) {
		for (var key in this.nodes) {
			callback.call(this, this.nodes[key]);
		}
	}

	/**
	 * @public
	 * @return {Boolean} returns true if the callback ever returns true
	 * @param {Function} callback execute function for each subnode until returns true. Arguments GroupNode
	 *  */
	this.forEachUntilSuccess = function(callback) {
		for (var key in this.nodes) {
			if (callback.call(this, this.nodes[key]) === true) {
				return true;
			}
		}
		// return true only if there are no subnodes ?
		return false;
	}
	
	
	/**
	 * @public
	 * @return {Boolean} returns true if the callback ever returns true
	 *  */	
	this.hasNodes = function() {
		for (var key in this.nodes) {
			return true;
		}
		return false;
	}

}

/**
 * @properties={typeid:24,uuid:"59BC4702-4A13-4644-B132-EA0D715B73E5"}
 */
function GroupHashCache() {

	var rootGroupNode = new GroupNode('root');

	// methods
	this.getCachedFoundset;
	this.setCachedFoundset;
	this.clearAll;
	this.removeCachedFoundset;
	this.removeCachedFoundsetAtLevel;
	this.removeChildFoundsets;

	// TODO rename in foundsetUUID
	this.getCachedFoundset = function(rowGroupCols, groupKeys) {
		var node = getTreeNode(rootGroupNode, rowGroupCols, groupKeys);
		return node ? node.foundsetUUID : null;
	}

	this.setCachedFoundset = function(rowGroupCols, groupKeys, foundsetUUID) {
		var tree = getTreeNode(rootGroupNode, rowGroupCols, groupKeys, true);
		tree.foundsetUUID = foundsetUUID;
	}

	/**
	 * @param {String} foundsetUUID
	 * Remove the node */
	this.removeCachedFoundset = function(foundsetUUID) {
		return removeFoundset(rootGroupNode, foundsetUUID);
	}

	/**
	 * @param {Number} level
	 * Remove the node */
	this.removeCachedFoundsetAtLevel = function(level) {
		return removeFoundset(rootGroupNode, null, level);
	}

	/** 
	 * @param {String} foundsetUUID
	 * @param {String} [field]
	 * @param {String} [value]
	 * Remove all it's child node */
	this.removeChildFoundset = function(foundsetUUID, field, value) {
		return removeChildFoundsets(rootGroupNode, foundsetUUID, field, value);
	}

	this.clearAll = function() {

		rootGroupNode.forEach(function(node) {
			if (node.foundsetUUID) {
				removeFoundset(rootGroupNode, node.foundsetUUID);
			} else {
				// TODO is it this possible
				$log.error('There is a root node without a foundset UUID, it should not happen');
			}

		});
		if ($scope.model.hashedFoundsets.length > 0) {
			$log.error("Clear All was not successful, please debug");
		}
	}

	/**
	 * @param {GroupNode} tree
	 * @param {String} foundsetUUID
	 * @param {Number} [level]
	 *  */
	function removeFoundset(tree, foundsetUUID, level) {
		if (!tree) {
			return true;
		}

		if (!foundsetUUID && level === undefined) {
			return true;
		}

		return tree.forEachUntilSuccess(function(node) {

			// remove the foundset and all it's child nodes if foundsetUUID or level === 0
			if ( (foundsetUUID && node.foundsetUUID === foundsetUUID) || (level === 0)) {
				// delete all subnodes
				node.forEach(function(subNode) {
					removeFoundset(subNode, subNode.foundsetUUID);
				});
				// TODO should this method access the foundsetManager ? is not a good encapsulation
				var foundsetManager = getFoundsetManagerByFoundsetUUID(node.foundsetUUID);
				foundsetManager.destroy();
				delete tree.nodes[node.id];
				return true;
			} else {
				var success = node.forEachUntilSuccess(function(subNode) {
					return removeFoundset(node, foundsetUUID, level ? level - 1 : undefined)
				})

				if (success) return true;
			}
			return false;
		});
	}

	/**
	 * @param {GroupNode} tree
	 * @param {String} foundsetUUID
	 * @param {String} [field]
	 * @param {String} [value]
	 *  */
	function removeChildFoundsets(tree, foundsetUUID, field, value) {
		if (!tree) {
			return false;
		}

		if (!foundsetUUID) {
			return false;
		}

		var success = true;
		tree.forEach(function(node) {
			if (node.foundsetUUID === foundsetUUID) {
				// delete all subnodes
				success = true;
				node.forEach(function(subNode) {
					var childFoundsetUUID = subNode.foundsetUUID;
					var foundsetRef = getFoundsetManagerByFoundsetUUID(childFoundsetUUID);
					// FIXME this solution is horrible, can break if rows.length === 0 or...
					// A better solution is to retrieve the proper childFoundsetUUID by rowGroupCols/groupKeys
					if (foundsetRef && ( (field === null || field === undefined) || (field !== null && field !== undefined && foundsetRef.foundset.viewPort.rows[0] && foundsetRef.foundset.viewPort.rows[0][field] == value))) {
						success = (removeFoundset(node, childFoundsetUUID) && success);
					} else {
						$log.debug('ignore the child foundset');
					}
				});
			} else if (node.hasNodes()) { // search in subnodes
				success = success && node.forEachUntilSuccess(function(subNode) {
					return removeChildFoundsets(node, foundsetUUID)
				});
			}
		});
		return success;
	}

	/**
	 * @param {GroupNode} tree
	 * @param {Array} rowGroupCols
	 * @param {Array} groupKeys
	 * @param {Boolean} [create]
	 *
	 * @return {GroupNode}
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

		if (!tree || !tree.nodes) {
			return null;
		}

		// the column id e.g. customerid, shipcity
		var columnId = rowGroupCols[0].field;

		// the tree for the given column
		var colTree = tree.nodes[columnId];

		// create the tree node if does not exist
		if (!colTree && create) {
			colTree = new GroupNode(columnId);
			tree.nodes[columnId] = colTree;
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
					keyTree = new GroupNode(key);
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
					keyTree = new GroupNode(key);
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

			result = getTreeNode(subTree, rowGroupCols, groupKeys, create);

		} else {
			$log.warn("No group criteria, should not happen");
		}

		return result;
	}
}

/**
 * @properties={typeid:35,uuid:"306A613F-0C36-4D09-BE8A-DFFDD11EB0DE",variableType:-4}
 */
var $log = {
	debug: function(msg) {
		application.output(msg);
	},
	warn: function(msg) {
		application.output(msg, LOGGINGLEVEL.WARNING);
	},
	error: function(msg) {
		application.output(msg, LOGGINGLEVEL.ERROR);
	}
}

/**
 * @param foundsetUUID
 *
 * @properties={typeid:24,uuid:"D5C7AB5A-FBC8-4B00-AAF4-C834A2CC092A"}
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
 * @properties={typeid:24,uuid:"83FB9A31-E0F4-47AB-B60A-B2DF504A59FB"}
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
 * @properties={typeid:24,uuid:"E1CC37C0-6656-4EC8-AB1F-C080A10C1195"}
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
 * @properties={typeid:24,uuid:"4E0D1156-A125-4DD9-8AF4-A2839EAC6E35"}
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
 * @properties={typeid:24,uuid:"41DC4FFB-51B6-4268-94FA-29A00AEF16CC"}
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
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid');
	jsunit.assertEquals('u-customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI');
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
 * @properties={typeid:24,uuid:"708C6906-0C1A-4DB6-8CBE-DFCD2365BEC4"}
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
 * @properties={typeid:24,uuid:"D81CB42B-501E-4112-B64C-8BCD3E4C8502"}
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
	//jsunit.assertTrue(cache.removeChildFoundset('customerid-ALFKI-shipcity-Athens')); // remove id
	//jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check other id still exists
	//jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

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
 * @properties={typeid:24,uuid:"0EB7B3A1-0200-482F-B244-EDB3FB1EE17E"}
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

	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, groupKeys));
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
