customProperties:"formComponent:false",
dataSource:"db:/example_data/orders",
encapsulation:60,
items:[
{
location:"11,9",
onActionMethodID:"D386458D-C32F-4FD1-BDAC-4183D66BFADA",
size:"80,20",
text:"Find",
typeid:7,
uuid:"40915ECD-68B2-4BFE-896C-7EFE2DA70508"
},
{
anchors:11,
labelFor:"customerid",
location:"146,76",
name:"customerid_label",
size:"140,20",
text:"Customerid",
transparent:true,
typeid:7,
uuid:"4FB8665C-8DA4-49F1-866B-CD851ADB358F"
},
{
anchors:11,
dataProviderID:"customerid",
location:"146,96",
name:"customerid",
size:"140,20",
typeid:4,
uuid:"6AD7136B-D26A-47FE-9AA5-12101E51EE3E"
},
{
dataProviderID:"ordercount",
location:"318,15",
size:"80,20",
text:"label",
typeid:7,
uuid:"7278504A-EB8F-4E18-A445-CAE628BDECF6"
},
{
location:"107,9",
onActionMethodID:"3FF3EB80-5983-45D7-B199-C0A93FF6B640",
size:"80,20",
text:"Search",
typeid:7,
uuid:"A6BF33E3-9B58-4EE0-BF39-72FCA9F9D901"
},
{
anchors:11,
dataProviderID:"shipcity",
location:"286,96",
name:"shipcity",
size:"140,20",
typeid:4,
uuid:"D7569C06-EDED-4054-AD76-07116D5B5E0B"
},
{
height:199,
partType:5,
typeid:19,
uuid:"D8679874-8ED7-461B-A2A2-57B5B756F036"
},
{
height:36,
partType:1,
typeid:19,
uuid:"F5BE84AF-DFF8-49F5-ACC1-1901E68E8471"
},
{
anchors:11,
labelFor:"shipcity",
location:"286,76",
name:"shipcity_label",
size:"140,20",
text:"Shipcity",
transparent:true,
typeid:7,
uuid:"F60102CA-BCFE-423C-A034-FDCB723AA263"
},
{
anchors:11,
dataProviderID:"orderid",
editable:false,
location:"6,96",
name:"orderid",
size:"140,20",
typeid:4,
uuid:"FBF01891-3C26-4BDA-BE08-B7C017D39144"
},
{
anchors:11,
labelFor:"orderid",
location:"6,76",
name:"orderid_label",
size:"140,20",
text:"Orderid",
transparent:true,
typeid:7,
uuid:"FC64B5F9-1C55-4D37-AF00-E037D6118F45"
}
],
name:"ordersCustomerTable",
scrollbars:32,
showInMenu:true,
size:"411,469",
typeid:3,
uuid:"B658C480-695C-420F-8E68-9793B2035291",
view:3