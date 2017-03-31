{
	"name": "uigridfilter-uigridfilter",
	"displayName": "uigridfilter",
	"version": 1,
	"definition": "uigridfilter/uigridfilter/uigridfilter.js",
	"libraries": 
	[
		{
			"name": "angular-touch.js",
			"version": "1",
			"url": "http://ajax.googleapis.com/ajax/libs/angularjs/1.4.3/angular-touch.js",
			"mimetype": "text/javascript"
		},

		{
			"name": "angular-animate.js",
			"version": "1",
			"url": "http://ajax.googleapis.com/ajax/libs/angularjs/1.4.3/angular-animate.js",
			"mimetype": "text/javascript"
		},

		{
			"name": "csv.js",
			"version": "1",
			"url": "http://ui-grid.info/docs/grunt-scripts/csv.js",
			"mimetype": "text/javascript"
		},

		{
			"name": "pdfmake.js",
			"version": "1",
			"url": "http://ui-grid.info/docs/grunt-scripts/pdfmake.js",
			"mimetype": "text/javascript"
		},

		{
			"name": "vfs_fonts.js",
			"version": "1",
			"url": "http://ui-grid.info/docs/grunt-scripts/vfs_fonts.js",
			"mimetype": "text/javascript"
		},

		{
			"name": "ui-grid.js",
			"version": "1",
			"url": "http://ui-grid.info/release/ui-grid.js",
			"mimetype": "text/javascript"
		},

		{
			"name": "ui-grid.css",
			"version": "1",
			"url": "http://ui-grid.info/release/ui-grid.css",
			"mimetype": "text/css"
		},

		{
			"name": "main.css",
			"version": "1",
			"url": "uigridfilter/uigridfilter/css/main.css",
			"mimetype": "text/css"
		}
	],

	"model": 
	{
		"myFoundset": {"type": "foundset", "dynamicDataproviders": true, "initialPreferredViewPortSize": 70, "sendSelectionViewportInitially": true },

		"root" : {"type" : "foundsetref"},
		"groupings": {"type" : "grouping[]", "pushToServer": "shallow"},
		"columns": 
		{
			"type": "displayHeader[]",
			"droppable": true
		},

		"numRows": "int"
	},
	"handlers": 
	{
		"onActionMethodID": 
		{
			"parameters": 
			[
				{
					"name": "clickedColumns",
					"type": "object"
				}
			]
		},
		"onGroupChanged" : {
			"parameters": 
			[
				{
					"name": "dataproviderName",
					"type": "string"
				},
				{
					"name": "grouping",
					"type": "true"
				}
			]
		},
		"onNodeExpanded" : {
			"parameters": 
			[
				{
					"name": "dataproviderName",
					"type": "string"
				},
				{
					"name": "value",
					"type": "string"
				}
			]
		}
	},
	"types": 
	{
		"displayHeader": 
		{
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },

			"headerTitle": "string",
			"dp": "string",
			"isPK": { "type": "boolean", "default": false },
			"relationname" : {"type" : "string"},
			"datasource" : {"type" : "string"},
			"visible":  { "type": "boolean", "default": false },

			"footerAggregate": 
			{
				"type": "int",
				"values": 
				[
					{
						"COUNT": 0
					},

					{
						"SUM": 1
					},

					{
						"MIN": 2
					},

					{
						"MAX": 3
					},

					{
						"AVG": 4
					}
				]
			}
		},
		"grouping" : {
			"field" : "string",
			"relation" : "string",
			"datasource" : "string"
		}
	}
}