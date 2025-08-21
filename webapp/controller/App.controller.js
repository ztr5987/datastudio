sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/m/library',
	"../model/formatter",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/util/File",
	"sap/ui/core/routing/HashChanger"
], function (Controller, lib, formatter, JSONModel, MessageToast, MessageBox, File, HashChanger) {
	"use strict";

	// Here the available connections can be added
	var aAvailableConnections = [{
		key: "erd", // unique alias as in xs-app.json and ui5.yaml
		text: "ERD100", // text to display in dropdown 
		url: "http://asapioerd.asapio.lokal:8000", // path to web gui
	}, {
		key: "s4d",
		text: "S4D100",
		url: "https://s4hana01.asapio.lokal:44300"
	}];

	var aSupportedConnectors = ["AWS", "AZURE", "FABRIC", "CONFLUENT", "GOOGLE_PS", "KAFKA", "KAFKA_V3", "REST", "SAP_AEM", "SAP_EM",
		"SOLACE",
		"STREAMSETS"
	];

	var URLHelper = lib.URLHelper;
	var oBindContext, oDeploymentDefault, sModelKey, isMessageBoxOpen, oRowContextObj;
	var HashChanger = HashChanger.getInstance();

	return Controller.extend("datastudio.controller.App", {
		formatter: formatter,
		onInit: function () {
			isMessageBoxOpen = false;
			var oDate = new Date();
			oDate.setHours(oDate.getHours() - 1);
			this.getView().setModel(new JSONModel({
				"interfaces": [],
				"createEvt": {},
				"monitorFromDate": oDate,
				"monitorToDate": new Date(),
				"monitoringData": [],
				"availableConnections": aAvailableConnections,
				"isLogoVisible": true
			}), "helperModel");

			this.getView().setModel(new JSONModel({
				"navigation": [{
					"key": "dataObj",
					"title": "Data Catalog",
					"icon": "sap-icon://curriculum"
				}, {
					"key": "interface",
					"title": "Interfaces",
					"icon": "sap-icon://connected"
				}, {
					"key": "predefEvents",
					"title": "Events",
					"icon": "sap-icon://workflow-tasks"
				}, {
					"key": "connect",
					"title": "Connections",
					"icon": "sap-icon://disconnected"
				}, {
					"key": "monitor",
					"title": "Monitoring",
					"icon": "sap-icon://line-charts"
				}, {
					"key": "help",
					"title": "Help",
					"icon": "sap-icon://hint"
				}]
			}), "sideBar");
			//this.getView().byId("sideNav").setSelectedKey("dataObj");

			oDeploymentDefault = {
				ConnectionId: "",
				InterfaceId: "",
				DataLogToHeaderFields: [],
				LoadType: "",
				IsActive: false
			};

			this.getView().setModel(new JSONModel(JSON.parse(JSON.stringify(oDeploymentDefault))), "deployment");

			this.getView().setModel(new JSONModel({
				ConnectionId: "",
				InterfaceId: "",
				InterfacesToHeaderFields: [{
					Name: "ACI_PACK_TABLE",
					Value: "",
					Mandatory: true,
					isPredefined: true
				}, {
					Name: "ACI_PACK_RETRY_TIME",
					Value: "",
					Mandatory: false,
					isPredefined: true
				}, {
					Name: "ACI_PACK_WHERE_COND",
					Value: "",
					Mandatory: false,
					isPredefined: true
				}, {
					Name: "ACI_PACK_SIZE",
					Value: "",
					Mandatory: true,
					isPredefined: true
				}, {
					Name: "ACI_PACK_KEY_LENGTH",
					Value: "",
					Mandatory: true,
					isPredefined: true
				}],
				LoadType: "P",
				ExtractionType: ""
			}), "createInterface");

			if (!this.oModelSelectDialog) {
				this.oModelSelectDialog = new sap.m.Dialog({
					title: "Select the system to connect",
					content: new sap.m.Select("availableModels", {
						width: "90%",
						items: aAvailableConnections.map(function (item) {
							return new sap.ui.core.Item({
								key: item.key,
								text: item.text
							});
						})
					}).addStyleClass("sapUiSmallMargin"),
					beginButton: new sap.m.Button({
						type: lib.ButtonType.Emphasized,
						text: "OK",
						press: function () {
							sModelKey = sap.ui.getCore().byId("availableModels").getSelectedKey();
							this.getView().byId("availableModelsHeader").setSelectedKey(sModelKey);
							this._setModel(sModelKey);
							this.oModelSelectDialog.close();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: "Close",
						press: function () {
							this.oModelSelectDialog.close();
						}.bind(this)
					})
				});
				this.getView().addDependent(this.oModelSelectDialog);
				this.oModelSelectDialog.addStyleClass("sapUiSizeCompact sapUiResponsivePadding--content");
			}
			this.oModelSelectDialog.open();

			this.oNavContainer = this.byId("pageContainer");
			HashChanger.attachEvent("hashChanged", function (oEvent) {
				if (this.getView().getModel()) {
					var sHash = oEvent.getParameter("newHash");
					switch (sHash) {
						case "DataCatalog":
							if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "dataObj") {
								this.oNavContainer.to(this.getView().byId("dataObj"));
							}
							this.getView().byId("sideNav").setSelectedKey("dataObj");
							break;
						case "Interfaces":
							if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "interface") {
								this.oNavContainer.to(this.getView().byId("interface"));
							}
							this.getView().byId("sideNav").setSelectedKey("interface");
							break;
						case "Interfaces/CreateInterface":
							if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "createInterface") {
								this.oNavContainer.to(this.getView().byId("createInterface"));
							}
							this.getView().byId("sideNav").setSelectedKey("interface");
							break;
						case "Events":
							if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "predefEvents") {
								this.oNavContainer.to(this.getView().byId("predefEvents"));
							}
							this.getView().byId("sideNav").setSelectedKey("predefEvents");
							break;
						case "Connections":
							if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "connect") {
								this.oNavContainer.to(this.getView().byId("connect"));
							}
							this.getView().byId("sideNav").setSelectedKey("connect");
							break;
						case "Monitoring":
							if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "monitor") {
								this.oNavContainer.to(this.getView().byId("monitor"));
							}
							this.getView().byId("sideNav").setSelectedKey("monitor");
							break;
						case "Help":
							if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "help") {
								this.oNavContainer.to(this.getView().byId("help"));
							}
							this.getView().byId("sideNav").setSelectedKey("help");
							break;
						default:
							if (sHash.includes("DataCatalog/Object") && sHash.includes("Deploy")) {
								if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "deploy") {
									var sHash = HashChanger.getHash().split("/").pop();
									if (sHash !== "Deploy") {
										var sKey = sHash.replace("Deploy", "/DataActivationLog");
										var oBindObj = this.getView().getModel().getProperty(sKey);
										if (oBindContext, oBindObj) {
											this._setDeployPage(oBindContext, oBindObj);
										}
									} else {
										if (oRowContextObj && oBindContext) {
											this._setDeployEmptyPage();
										}
									}
									this.oNavContainer.to(this.getView().byId("deploy"));
									this.getView().byId("sideNav").setSelectedKey("dataObj");
									var sLinkText = oBindContext.getObject().Description;
									this.getView().byId("dataObjLinkMainDeploy").setText(sLinkText);
								}
							} else if (sHash.includes("DataCatalog/Object")) {
								if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "dataObjDetails") {
									var sKey = HashChanger.getHash().split("/").pop().replace("Object", "/DataCatalogSet");
									this.oNavContainer.to(this.getView().byId("dataObjDetails"));
									this.getView().byId("sideNav").setSelectedKey("dataObj");
									var oContext = new sap.ui.model.Context(this.getView().getModel(), sKey);
									this._setDataObjDetails(oContext);
								}
							} else if (sHash.includes("Interfaces/Interface") && sHash.includes("Deploy")) {
								if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "deploy") {
									var sKey = HashChanger.getHash().split("/").pop().replace("Deploy", "/DataActivationLog");
									this.oNavContainer.to(this.getView().byId("deploy"));
									this.getView().byId("sideNav").setSelectedKey("interface");
									var oBindObj = this.getView().getModel().getProperty(sKey);
									this._setDeployPage(oBindContext, oBindObj);
									var sLinkText = oBindContext.getObject().Description;
									this.getView().byId("dataObjLinkMainDeploy").setText(sLinkText);
								}
							} else if (sHash.includes("Interfaces/Interface")) {
								if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "interfaceDetails") {
									var sKey = HashChanger.getHash().split("/").pop().replace("Interface", "/InterfacesSet");
									this.oNavContainer.to(this.getView().byId("interfaceDetails"));
									this.getView().byId("sideNav").setSelectedKey("interface");
									var oContext = new sap.ui.model.Context(this.getView().getModel(), sKey);
									this._setInterfaceDetails(oContext);
								}
							} else if (sHash.includes("Events/Event")) {
								if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "predefEventDetails") {
									var sKey = HashChanger.getHash().split("/").pop().replace("Event", "/DataEventSet");
									this.oNavContainer.to(this.getView().byId("predefEventDetails"));
									this.getView().byId("sideNav").setSelectedKey("predefEvents");
									this.getView().byId("predefEventDetails").setBindingContext(new sap.ui.model.Context(this.getView().getModel(), sKey));
								}
							}
							break;
					}
				}
			}.bind(this));

			if (window.location.hash) {
				HashChanger.setHash(decodeURI(window.location.hash.slice(2)));
			}
		},

		readInitialSettings: function (oModel) {
			oModel.callFunction("/GetInitialSettings", {
				method: "GET",
				success: function (oData) {
					oData.results.forEach(function (item) {
						if (item.Switch === "ACI_LOGO" && item.Value === "X") {
							this.getView().getModel("helperModel").setProperty("/isLogoVisible", true);
						}
					}.bind(this));
				}.bind(this),
				error: function () {

				}
			});
		},

		onConnectionChanged: function (evt) {
			sModelKey = evt.getSource().getSelectedKey();
			this._setModel(sModelKey);
		},

		_setModel: function (sModelKey) {
			var oModelObj = aAvailableConnections.find(function (item) {
				return item.key === sModelKey;
			});
			var oModel = new sap.ui.model.odata.v2.ODataModel(oModelObj.key + "/sap/opu/odata/ASADEV/GW_CONFIG_API_SRV/");
			oModel.setUseBatch(false);
			this.getView().setModel(oModel);
			//this.readInitialSettings(oModel);
			//this.getView().getModel().setUseBatch(false);

			this.getView().byId("pageHeader").setTitle("Data Studio" + " (" + oModelObj.text + ")");

			var fn = function (evt) {
				if (evt.getParameter("url").includes("/DataCatalogSet/$count")) {
					var iLength = evt.getParameters().response.responseText;
					var sText = this.getView().byId("objectTypeSwitch").getState() ? "Standard Data Objects" :
						"Custom Data Objects";
					this.byId("dataObjBC").setCurrentLocationText(sText + " (" + iLength + ")");
				}

				if (evt.getParameter("url").includes("/ObjectToLog/$count")) {
					var iLength = evt.getParameters().response.responseText;
					//this.byId("logPanel").setHeaderText("Active Instances (" + iLength + ")");
				}

				if (evt.getParameter("url").includes("/InterfacesSet/$count")) {
					var iLength = evt.getParameters().response.responseText;
					this.byId("interfaceBC").setCurrentLocationText("Interfaces (" + iLength + ")");
				}

				if (evt.getParameter("url").includes("/ConnectionSet/$count")) {
					var iLength = evt.getParameters().response.responseText;
					this.byId("connectionTableHeader").setText("Connections (" + iLength + ")");
				}

				if (evt.getParameter("response").statusCode === 200 && !isMessageBoxOpen && (evt.getParameter("response").message ===
					"no handler for data" || evt.getParameter(
						"response").message === 'Response did not contain a valid OData result')) {
					isMessageBoxOpen = true;
					MessageBox.error("Session expired. Please try to refresh the page.", {
						onClose: function () {
							isMessageBoxOpen = false;
						}.bind(this)
					});
				}
			}.bind(this);
			this.getView().getModel().attachRequestCompleted(fn);

			this.getView().getModel().attachRequestFailed(function (evt) {
				if (evt.getParameter("response").statusCode.toString().startsWith("50")) {
					MessageBox.error("An error appeared during the request execution. Please try to refresh the page.");
				}
			});

			if (!this.getView().byId("dataObjContent").getBinding("items")) {
				var oTemplate = this.getView().byId("dataObjContentTemplate");
				this.getView().byId("dataObjContent").removeAllItems();
				this.getView().byId("dataObjContent").bindAggregation("items", {
					path: '/DataCatalogSet',
					filters: [new sap.ui.model.Filter("CatalogObjectId", sap.ui.model.FilterOperator
						.StartsWith, "/ASAPIO/")],
					sorter: {
						path: 'Description',
						descending: false,
						group: '.grouper'
					},
					parameters: {
						custom: {
							search: ""
						}
					},
					groupHeaderFactory: '.getGroupHeader',
					template: new sap.f.GridListItem({
						content: oTemplate
					}),
					templateShareable: true,
					events: {
						dataReceived: function (innerEvt) {

						}.bind(this)
					}
				});
			}

			this.getView().getModel().refresh(true);
			this.getView().byId("interfaceConnectionId").setSelectedKey("");

			this.setInitialContext();
		},

		setInitialContext: function () {
			if (!this.oNavContainer) {
				this.oNavContainer = this.byId("pageContainer");
			}
			var sHash = HashChanger.getHash(),
				oModel = this.getView().getModel();
			if (sHash.includes("Events/Event")) {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "predefEventDetails") {
					var sKey = HashChanger.getHash().split("/").pop().replace("Event", "/DataEventSet");
					oModel.read(sKey, {
						success: function (oData) {
							if (oData && !this.isObjectEmpty(oData)) {
								this.oNavContainer.to(this.getView().byId("predefEventDetails"));
								this.getView().byId("sideNav").setSelectedKey("predefEvents");
								this.getView().byId("predefEventDetails").setBindingContext(new sap.ui.model.Context(oModel, sKey));
							} else {
								HashChanger.setHash("Events");
								this.oNavContainer.to(this.getView().byId("predefEvents"));
								this.getView().byId("sideNav").setSelectedKey("predefEvents");
							}
						}.bind(this),
						error: function () {
							HashChanger.setHash("Events");
							this.oNavContainer.to(this.getView().byId("predefEvents"));
							this.getView().byId("sideNav").setSelectedKey("predefEvents");
						}.bind(this)
					});
				}
			} else if (sHash.includes("DataCatalog/Object")) {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "dataObjDetails") {
					var sKey = HashChanger.getHash().split("/").pop();
					if (sKey === "Deploy" || !sKey.includes("Deploy")) {
						sKey = sKey.replace("Object", "/DataCatalogSet");
						if (sKey === "Deploy") {
							var sHash = HashChanger.getHash().split("/")[HashChanger.getHash().split("/").length - 2];
							HashChanger.setHash("DataCatalog/" + sHash);
							sKey = HashChanger.getHash().split("/")[1].replace("Object", "/DataCatalogSet");
						}
						oModel.read(sKey, {
							success: function (oData) {
								if (oData && !this.isObjectEmpty(oData)) {
									this.oNavContainer.to(this.getView().byId("dataObjDetails"));
									this.getView().byId("sideNav").setSelectedKey("dataObj");
									var oContext = new sap.ui.model.Context(oModel, sKey);
									this._setDataObjDetails(oContext);
								} else {
									HashChanger.setHash("DataCatalog");
									this.oNavContainer.to(this.getView().byId("dataObj"));
									this.getView().byId("sideNav").setSelectedKey("dataObj");
								}
							}.bind(this),
							error: function () {
								HashChanger.setHash("DataCatalog");
								this.oNavContainer.to(this.getView().byId("dataObj"));
								this.getView().byId("sideNav").setSelectedKey("dataObj");
							}.bind(this)
						});
					} else {
						if (sKey.includes("Deploy")) {
							this.getView().byId("sideNav").setSelectedKey("dataObj");
							sKey = sKey.replace("Deploy", "/DataActivationLog");
							var sPrevKey = HashChanger.getHash().split("/")[1].replace("Object", "/DataCatalogSet");
							oModel.read(sKey, {
								success: function (oData) {
									if (oData && !this.isObjectEmpty(oData)) {
										var oBindObj = oData;
									}
									oModel.read(sPrevKey, {
										success: function (oData) {
											if (oData && !this.isObjectEmpty(oData)) {
												var oContext = new sap.ui.model.Context(oModel, sPrevKey);
												oBindContext = oContext;
												var sLinkText = oContext.getObject().Description;
												this.getView().byId("dataObjLinkMainDeploy").setText(sLinkText);
												this._setDataObjDetails(oContext);
												if (oBindObj) {
													this.oNavContainer.to(this.getView().byId("deploy"));
													this._setDeployPage(oContext, oBindObj);

												} else {
													this.oNavContainer.to(this.getView().byId("dataObjDetails"));
												}
											} else {
												MessageBox.error("No corresponding object found in backend");
											}
										}.bind(this),
										error: function () {
											HashChanger.setHash("DataCatalog");
											this.oNavContainer.to(this.getView().byId("dataObj"));
											this.getView().byId("sideNav").setSelectedKey("dataObj");
										}.bind(this)
									});
								}.bind(this),
								error: function () {
									HashChanger.setHash("DataCatalog");
									this.oNavContainer.to(this.getView().byId("dataObj"));
									this.getView().byId("sideNav").setSelectedKey("dataObj");
								}.bind(this)
							});
						}
					}
				}
			} else if (sHash.includes("Interfaces/Interface")) {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "interfaceDetails") {
					var sKey = HashChanger.getHash().split("/").pop();
					if (sKey === "Deploy" || !sKey.includes("Deploy")) {
						sKey = sKey.replace("Interface", "/InterfacesSet");
						if (sKey === "Deploy") {
							var sHash = HashChanger.getHash().split("/")[HashChanger.getHash().split("/").length - 2];
							HashChanger.setHash("Interfaces/" + sHash);
							sKey = HashChanger.getHash().split("/")[1].replace("Interface", "/InterfacesSet");
						}
						oModel.read(sKey, {
							success: function (oData) {
								if (oData && !this.isObjectEmpty(oData)) {
									this.oNavContainer.to(this.getView().byId("interfaceDetails"));
									this.getView().byId("sideNav").setSelectedKey("interface");
									var oContext = new sap.ui.model.Context(oModel, sKey);
									this._setInterfaceDetails(oContext);
								} else {
									HashChanger.setHash("Interfaces");
									this.oNavContainer.to(this.getView().byId("interface"));
									this.getView().byId("sideNav").setSelectedKey("interface");
								}
							}.bind(this),
							error: function () {
								HashChanger.setHash("Interfaces");
								this.oNavContainer.to(this.getView().byId("interface"));
								this.getView().byId("sideNav").setSelectedKey("interface");
							}.bind(this)
						});
					} else {
						if (sKey.includes("Deploy")) {
							this.getView().byId("sideNav").setSelectedKey("interface");
							sKey = sKey.replace("Deploy", "/DataActivationLog");
							var sPrevKey = HashChanger.getHash().split("/")[1].replace("Interface", "/InterfacesSet");
							oModel.read(sKey, {
								success: function (oData) {
									if (oData && !this.isObjectEmpty(oData)) {
										var oBindObj = oData;
									}
									oModel.read(sPrevKey, {
										success: function (oData) {
											if (oData && !this.isObjectEmpty(oData)) {
												var oContext = new sap.ui.model.Context(oModel, sPrevKey);
												oBindContext = oContext;
												var sLinkText = oContext.getObject().InterfaceId;
												this.getView().byId("dataObjLinkMainDeploy").setText(sLinkText);
												this._setInterfaceDetails(oContext);
												if (oBindObj) {
													this.oNavContainer.to(this.getView().byId("deploy"));
													this._setDeployPage(oContext, oBindObj);

												} else {
													this.oNavContainer.to(this.getView().byId("interfaceDetails"));
												}
											} else {
												MessageBox.error("No corresponding object found in backend");
											}
										}.bind(this),
										error: function () {
											HashChanger.setHash("Interfaces");
											this.oNavContainer.to(this.getView().byId("interface"));
											this.getView().byId("sideNav").setSelectedKey("interface");
										}.bind(this)
									});
								}.bind(this),
								error: function () {
									HashChanger.setHash("Interfaces");
									this.oNavContainer.to(this.getView().byId("interface"));
									this.getView().byId("sideNav").setSelectedKey("interface");
								}.bind(this)
							});
						}
					}
				}
			} else if (sHash === "DataCatalog") {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "dataObj") {
					this.oNavContainer.to(this.getView().byId("dataObj"));
					this.getView().byId("sideNav").setSelectedKey("dataObj");
				}
			} else if (sHash === "Interfaces") {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "interface") {
					this.oNavContainer.to(this.getView().byId("interface"));
					this.getView().byId("sideNav").setSelectedKey("interface");
				}
			} else if (sHash === "Connections") {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "connect") {
					this.oNavContainer.to(this.getView().byId("connect"));
					this.getView().byId("sideNav").setSelectedKey("connect");
				}
			} else if (sHash === "Monitoring") {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "monitor") {
					this.oNavContainer.to(this.getView().byId("monitor"));
					this.getView().byId("sideNav").setSelectedKey("monitor");
				}
			} else if (sHash === "Events") {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "predefEvents") {
					this.oNavContainer.to(this.getView().byId("predefEvents"));
					this.getView().byId("sideNav").setSelectedKey("predefEvents");
				}
			} else if (sHash === "Help") {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "help") {
					this.oNavContainer.to(this.getView().byId("help"));
					this.getView().byId("sideNav").setSelectedKey("help");
				}
			} else {
				if (this.oNavContainer.getCurrentPage().getId().split("--").pop() !== "dataObj") {
					this.oNavContainer.to(this.getView().byId("dataObj"));
					HashChanger.setHash("DataCatalog");
					this.getView().byId("sideNav").setSelectedKey("dataObj");
				}
			}
		},

		isObjectEmpty: function (obj) {
			return Object.entries(obj).every(([key, value]) => {
				if (key === '__metadata') return true;
				// If it's an object with __deferred only, skip it
				if (typeof value === 'object' && value !== null) {
					return (
						Object.keys(value).length === 1 && value.hasOwnProperty('__deferred')
					);
				}
				// Check if it's a falsy value
				return !value;
			});
		},

		onItemSelect: function (evt) {
			var oItem = evt.getParameter("item");
			this.byId("pageContainer").to(this.getView().createId(oItem.getKey()));
			switch (oItem.getKey()) {
				case "dataObj":
					HashChanger.setHash("DataCatalog");
					break;
				case "interface":
					HashChanger.setHash("Interfaces");
					break;
				case "predefEvents":
					HashChanger.setHash("Events");
					break;
				case "connect":
					HashChanger.setHash("Connections");
					break;
				case "monitor":
					HashChanger.setHash("Monitoring");
					break;
				case "help":
					HashChanger.setHash("Help");
					break;
			}

			if (this.getView().getModel("device").getProperty("/system").phone) {
				var oToolPage = this.byId("toolPage");
				this._setToggleButtonTooltip(true);
				oToolPage.setSideExpanded(false);
			}

			// close edit form in case if it was opened
			this.getView().byId("predefEventDisplayForm").setVisible(true);
			this.getView().byId("predefEventEditForm").setVisible(false);
		},

		onObjectTypeChange: function (evt) {
			var oSource = this.getView().byId("dataObjContent").getBindingInfo("items");
			var bAsapioOn = evt.getSource().getState();
			oSource.parameters.custom.search = this.getView().byId("searchField").getValue();
			oSource.filters = bAsapioOn ? [new sap.ui.model.Filter("CatalogObjectId", sap.ui.model.FilterOperator.StartsWith, "/ASAPIO/")] : [
				new sap.ui.model.Filter("CatalogObjectId", sap.ui.model.FilterOperator.NotStartsWith, "/ASAPIO/")
			];
			this.getView().byId("dataObjContent").bindAggregation("items", oSource);
			this.getView().byId("dataObjContent").refreshAggregation("items");
			var sText = bAsapioOn ? "Standard Data Objects" : "Custom Data Objects";
			this.getView().byId("dataObjLink").setText(sText);
			this.getView().byId("dataObjLinkAllDeploy").setText(sText);
		},

		onSideNavButtonPress: function () {
			var oToolPage = this.byId("toolPage");
			var bSideExpanded = oToolPage.getSideExpanded();
			this._setToggleButtonTooltip(bSideExpanded);
			oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
		},

		_setToggleButtonTooltip: function (bLarge) {
			var oToggleButton = this.byId('sideNavigationToggleButton');
			if (bLarge) {
				oToggleButton.setTooltip('Large Size Navigation');
			} else {
				oToggleButton.setTooltip('Small Size Navigation');
			}
		},

		onBreadcrumbPress: function (evt) {
			switch (evt.getSource().getId().split("--").pop()) {
				case "dataObjLink":
				case "dataObjLinkAllDeploy":
					if (oBindContext.getPath().includes("Interfaces")) {
						this.byId("pageContainer").to(this.getView().createId("interface"));
						HashChanger.setHash("Interfaces");
					} else {
						this.byId("pageContainer").to(this.getView().createId("dataObj"));
						HashChanger.setHash("DataCatalog");
					}
					break;
				case "dataObjLinkMainDeploy":
					if (oBindContext.getPath().includes("Interfaces")) {
						this.byId("pageContainer").to(this.getView().createId("interfaceDetails"));
						this.getView().byId("interfaceDetails").setBindingContext(oBindContext);
						HashChanger.setHash("Interfaces/" + oBindContext.getPath().replace("/InterfacesSet", "Interface"));
					} else {
						this.byId("pageContainer").to(this.getView().createId("dataObjDetails"));
						this.getView().byId("dataObjDetails").setBindingContext(oBindContext);
						HashChanger.setHash("DataCatalog/" + oBindContext.getPath().replace("/DataCatalogSet", "Object"));
					}
					break;
				case "interfaceLink":
				case "createInterfaceInterfaces":
					this.byId("pageContainer").to(this.getView().createId("interface"));
					HashChanger.setHash("Interfaces");
					break;
				case "predefEventsLink":
					this.byId("pageContainer").to(this.getView().createId("predefEvents"));
					HashChanger.setHash("Events");
					this.getView().byId("predefEventDisplayForm").setVisible(true);
					this.getView().byId("predefEventEditForm").setVisible(false);
					break;
			}

			this.getView().byId("predefEventDisplayForm").setVisible(true);
			this.getView().byId("predefEventEditForm").setVisible(false);
		},

		transformToHash: function (str) {
			if (str.replace(/\//g, "") === str.replace(/\//g, "").toUpperCase()) {
				str = str.toLowerCase();
			}
			var hash = str.replace(/[^A-Za-z0-9 \/]/g, "").split("").map(function (a) {
				if (a.match(/[A-Z]/)) {
					return "-" + a.toLowerCase();
				} else if (a === " " || a === "/") {
					return "-";
				} else {
					return a;
				}
			}).join("");
			if (hash.charAt(0) === "-") {
				hash = hash.slice(1);
			}
			return hash;
		},

		onPanelExtPress: function (evt) {
			var sLinkId = evt.getSource().getContent()[0].getItems()[3].getItems()[1].getId();
			// Check if we navigate not from the link
			if (!$("#" + sLinkId).is(":hover")) {
				var oContext = evt.getSource().getBindingContext();
				this.byId("pageContainer").to(this.getView().createId("dataObjDetails"));
				HashChanger.setHash("DataCatalog/" + oContext.getPath().replace("/DataCatalogSet", "Object"));
				this._setDataObjDetails(oContext);

				oBindContext = oContext;
			}
		},

		_setDataObjDetails: function (oContext) {
			this.getView().byId("asyncAPIstring").setValue();
			this.getView().byId("availableInterfaces").setSelectedItem(null);
			this.getView().byId("dataObjDetails").setBindingContext(oContext);
			this.getView().byId("objToLog").bindAggregation("items", {
				templateShareable: false,
				path: oContext.getPath() + "/ObjectToLog",
				sorter: new sap.ui.model.Sorter({
					path: 'InterfaceId',
					group: true
				}),
				template: new sap.m.ColumnListItem({
					type: "Navigation",
					press: function (evt) {
						this.objToLogItemPress(evt, "dataObjDetails");
					}.bind(this),
					cells: [
						new sap.m.Text({
							text: "{ObjectName}"
						}),
						new sap.m.Text().bindProperty("text", "EventType", this.formatter.eventTypeText),
						new sap.m.Text({
							text: "{EventName}"
						}),
						new sap.m.Text({
							text: "{LoadType}"
						}),
						new sap.m.Text({
							text: "{ConnectionId}"
						}),
						new sap.m.Text({
							text: "{ChangedAt}"
						}),
						new sap.m.Text({
							text: "{ChangedBy}"
						}),
						new sap.m.ObjectStatus({
							text: "{ActivationState}",
							inverted: true
						}).bindProperty("state", "ActivationState", function (sValue) {
							switch (sValue) {
								case "Not used":
									return "None";
								case "Deployed":
									return "Success";
							}
						})
					]
				}),
				templateShareable: true,
				events: {
					dataReceived: function (evt) {
						var aInterfaces = evt.getParameter("data").results.filter((value, index, self) =>
							index === self.findIndex((t) => (
								t.InterfaceId === value.InterfaceId
							))
						);
						this.getView().getModel("helperModel").setProperty("/interfaces", aInterfaces);
						this.getView().getModel("helperModel").refresh(true);
					}.bind(this)
				}
			});
			this.getView().byId("objToEvents").bindAggregation("items", {
				path: oContext.getPath() + "/ObjectToEvents",
				template: new sap.m.ColumnListItem({
					cells: [
						new sap.m.Text().bindProperty("text", "EventType", this.formatter.eventTypeText),
						new sap.m.Text({
							text: "{ObjectId}"
						}),
						new sap.m.Text({
							text: "{ObjectName}"
						}),
						new sap.m.Text({
							text: "{EventName}"
						}),
						new sap.m.Text({
							text: "{ClassName}"
						}),
						new sap.m.Button({
							text: "Deploy",
							type: "Transparent",
							press: [this.openDeployForm, this]
						})
					]
				}),
				templateShareable: true
			});
			this.getView().byId("objToPayload").bindAggregation("items", {
				path: oContext.getPath() + "/ObjectToPayload",
				sorter: new sap.ui.model.Sorter({
					path: 'Tablename',
					group: true
				}),
				template: new sap.m.ColumnListItem({
					cells: [
						new sap.m.Text({
							text: "{Fieldname}"
						}),
						new sap.m.Text({
							text: "{Description}"
						}),
						new sap.m.Text({
							text: "{ViewFieldname}"
						}),
						new sap.m.Text({
							text: "{PayloadName}"
						}),
						new sap.m.CheckBox({
							selected: "{KeyFlag}",
							enabled: false
						}),
						new sap.m.CheckBox({
							selected: "{SkipFlag}",
							enabled: false
						}),
						new sap.m.Text({
							text: "{ConvClassName}"
						}),
						new sap.m.Text({
							text: "{ConvMethodName}"
						}),
						new sap.m.Text({
							text: "{DefaultValue}"
						}),
					]
				}),
				templateShareable: true
			});
			//this.setEqualHeight();
		},

		onInterfacePanelExtPress: function (evt) {
			var oContext = evt.getSource().getBindingContext();
			this.byId("pageContainer").to(this.getView().createId("interfaceDetails"));
			HashChanger.setHash("Interfaces/" + oContext.getPath().replace("/InterfacesSet", "Interface"));
			this._setInterfaceDetails(oContext);
		},

		_setInterfaceDetails: function (oContext) {
			this.getView().byId("interfaceDetails").setBindingContext(oContext);
			this.getView().byId("interfaceAsyncAPIstring").setValue();
			this.getView().byId("availableIntInterfaces").setSelectedItem(null);
			this.getView().byId("interfaceToLog").bindAggregation("items", {
				path: oContext.getPath() + "/InterfaceToLog",
				sorter: new sap.ui.model.Sorter({
					path: 'InterfaceId',
					group: true
				}),
				template: new sap.m.ColumnListItem({
					type: "Navigation",
					press: function (evt) {
						this.objToLogItemPress(evt, "interfaceDetails");
					}.bind(this),
					cells: [
						new sap.m.Text({
							text: "{ObjectName}"
						}),
						new sap.m.Text().bindProperty("text", "EventType", this.formatter.eventTypeText),
						new sap.m.Text({
							text: "{EventName}"
						}),
						new sap.m.Text({
							text: "{LoadType}"
						}),
						new sap.m.Text({
							text: "{ConnectionId}"
						}),
						new sap.m.Text({
							text: "{ChangedAt}"
						}),
						new sap.m.Text({
							text: "{ChangedBy}"
						}),
						new sap.m.ObjectStatus({
							text: "{ActivationState}",
							inverted: true
						}).bindProperty("state", "ActivationState", function (sValue) {
							switch (sValue) {
								case "Not used":
									return "None";
								case "Deployed":
									return "Success";
							}
						})
					]
				}),
				templateShareable: true,
				events: {
					dataReceived: function (evt) {
						var aInterfaces = evt.getParameter("data").results.filter((value, index, self) =>
							index === self.findIndex((t) => (
								t.InterfaceId === value.InterfaceId
							))
						);
						this.getView().getModel("helperModel").setProperty("/interfaces", aInterfaces);
						this.getView().getModel("helperModel").refresh(true);
					}.bind(this)
				}
			});
			//this.setEqualHeightInterface();
		},

		camelize: function (str) {
			var regCam = str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
				return index === 0 ? word.toLowerCase() : word.toUpperCase();
			}).replace(/\s+/g, '');
			return regCam.charAt(0).toUpperCase() + regCam.slice(1);
		},

		onCreateInterface: function () {
			this.byId("pageContainer").to(this.getView().createId("createInterface"));
			HashChanger.setHash("Interfaces/CreateInterface");
		},

		openDeployForm: function (evt) {
			oBindContext = this.getView().byId("dataObjDetails").getBindingContext();
			oRowContextObj = Object.assign({}, evt.getSource().getBindingContext().getObject());
			this._setDeployEmptyPage();
			this.byId("pageContainer").to(this.getView().createId("deploy"));
			HashChanger.setHash(HashChanger.getHash() + "/Deploy");
		},

		_setDeployEmptyPage: function () {
			var sLinkText = oBindContext.getObject().Description;
			oRowContextObj.ObjectName = "" + oRowContextObj.ObjectId;
			delete oRowContextObj.ObjectId;
			delete oRowContextObj.ClassName;
			Object.keys(oRowContextObj).forEach(function (prop) {
				this.getView().getModel("deployment").setProperty("/" + prop, oRowContextObj[prop]);
			}.bind(this));
			this.getView().byId("deploymentConnectionId").setForceSelection(false);
			this.getView().byId("deploymentConnectionId").setSelectedKey("");
			this.getView().getModel("deployment").setProperty("/DataLogToHeaderFields", []);
			this.getView().getModel("deployment").setProperty("/InterfaceId", "Z_" + sLinkText.toUpperCase() + oRowContextObj.CatalogObjectVersion
				.replace(".", ""));
			this.getView().getModel("deployment").setProperty("/entryExists", false);
			this.getView().byId("dataObjLinkMainDeploy").setText(sLinkText);
			this.getView().byId("dataObjLinkMainDeploy").attachEventOnce("press", function () {
				this.getView().getModel("deployment").setData(JSON.parse(JSON.stringify(oDeploymentDefault)));
				this.getView().getModel("deployment").refresh(true);
			}.bind(this));
		},

		onTransportInterface: function () {
			if (!this.getView().byId("interfaceContentTable").getSelectedItems().length) {
				//MessageBox.information("Please select at least one interface to transport.");
				MessageBox.information("Please select the interface to transport.");
				if (this.getView().byId("interfaceDisplayMode").getSelectedKey() !== "table") {
					this.getView().byId("interfaceDisplayMode").setSelectedKey("table");
					this.getView().byId("interfaceContent").setVisible(false);
					this.getView().byId("interfaceContentTable").setVisible(true);
				}
			} else {
				this.getView().getModel().read("/TransportSet", {
					success: function (oData) {
						var aWorkbenchReqs = oData.results.filter(function (item) {
							return item.Strfunction === "K" && item.Trfunction === "S";
						}),
							aCustReqs = oData.results.filter(function (item) {
								return item.Strfunction === "W" && item.Trfunction === "Q";
							});
						this.oTransportDialog = new sap.m.Dialog({
							title: "Transport interface configuration: Select transports",
							content: new sap.m.VBox({
								items: [
									new sap.m.VBox({
										items: [
											new sap.m.Label({
												text: "Workbench Requests:"
											}).addStyleClass("sapUiTinyMarginBottom"),
											new sap.m.Table("workbenchReqs", {
												mode: "SingleSelectLeft",
												fixedLayout: false,
												noDataText: "No TR found, please login to SAP system and create one",
												selectionChange: function () {
													if (sap.ui.getCore().byId("workbenchReqs").getSelectedItems().length &&
														sap.ui.getCore().byId("custReqs").getSelectedItems().length) {
														sap.ui.getCore().byId("transportIntConfBtn").setEnabled(true);
													} else {
														sap.ui.getCore().byId("transportIntConfBtn").setEnabled(false);
													}
												}.bind(this),
												columns: [
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Transport Number"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Transport Description"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Task Number"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "User"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Type"
														})
													})
												],
												items: aWorkbenchReqs.map(function (item) {
													return new sap.m.ColumnListItem({
														cells: [
															new sap.m.Text({
																text: item.Strkorr
															}),
															new sap.m.Text({
																text: item.As4text
															}),
															new sap.m.Text({
																text: item.Trkorr
															}),
															new sap.m.Text({
																text: item.As4user
															}),
															new sap.m.Text({
																text: this.getTypeText(item.Trfunction)
															})
														]
													})
												}.bind(this))
											}),
										]
									}).addStyleClass("sapUiMediumMarginBottom"),
									new sap.m.VBox({
										items: [
											new sap.m.Label({
												text: "Customizing Requests:"
											}).addStyleClass("sapUiTinyMarginBottom"),
											new sap.m.Table("custReqs", {
												mode: "SingleSelectLeft",
												fixedLayout: false,
												noDataText: "No TR found, please login to SAP system and create one",
												selectionChange: function () {
													if (sap.ui.getCore().byId("workbenchReqs").getSelectedItems().length &&
														sap.ui.getCore().byId("custReqs").getSelectedItems().length) {
														sap.ui.getCore().byId("transportIntConfBtn").setEnabled(true);
													} else {
														sap.ui.getCore().byId("transportIntConfBtn").setEnabled(false);
													}
												}.bind(this),
												columns: [
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Transport Number"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Transport Description"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Task Number"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "User"
														})
													}),
													new sap.m.Column({
														header: new sap.m.Text({
															text: "Type"
														})
													})
												],
												items: aCustReqs.map(function (item) {
													return new sap.m.ColumnListItem({
														cells: [
															new sap.m.Text({
																text: item.Strkorr
															}),
															new sap.m.Text({
																text: item.As4text
															}),
															new sap.m.Text({
																text: item.Trkorr
															}),
															new sap.m.Text({
																text: item.As4user
															}),
															new sap.m.Text({
																text: this.getTypeText(item.Trfunction)
															})
														]
													})
												}.bind(this))
											}),
										]
									})
								]
							}).addStyleClass("sapUiSmallMarginTopBottom"),
							beginButton: new sap.m.Button("transportIntConfBtn", {
								type: lib.ButtonType.Emphasized,
								enabled: true,
								text: "OK",
								press: function () {
									//this.getView().getModel().setUseBatch(true);
									//this.getView().getModel().setDeferredGroups(["transportIntConf"]);
									this.getView().byId("interfaceContentTable").getSelectedItems().forEach(function (item) {
										this.getView().getModel().create("/TransportIntConfigSet", {
											WorkbenchRequest: sap.ui.getCore().byId("workbenchReqs").getSelectedItem().getCells()[2].getText(),
											CustomizingRequest: sap.ui.getCore().byId("custReqs").getSelectedItem().getCells()[2].getText(),
											InterfaceId: item.getBindingContext().getObject().InterfaceId,
											ConnectionId: item.getBindingContext().getObject().ConnectionId
										}, {
											success: function (oData) {
												MessageBox.success("The interface was successfully transported.");
											},
											error: function (oError) {
												MessageBox.error(JSON.parse(oError.responseText).error.message.value);
											}
										});
									}.bind(this));
									this.oTransportDialog.close();
									this.oTransportDialog.destroy();
								}.bind(this)
							}),
							endButton: new sap.m.Button({
								text: "Close",
								press: function () {
									this.oTransportDialog.close();
									this.oTransportDialog.destroy();
								}.bind(this)
							})
						});
						this.oTransportDialog.addStyleClass("sapUiSizeCompact sapUiResponsivePadding--content");
						this.oTransportDialog.open();
					}.bind(this),
					error: function () { }
				});
			}
		},

		getTypeText: function (sType) {
			switch (sType) {
				case "K":
					return "Workbench Request";
				case "W":
					return "Customizing Request";
				case "C":
					return "Relocation of Objects Without Package Change";
				case "O":
					return "Relocation of Objects With Package Change";
				case "E":
					return "Relocation of Complete Package";
				case "T":
					return "Transport of Copies";
				case "S":
					return "Development/Correction";
				case "R":
					return "Repair";
				case "X":
					return "Unclassified Task";
				case "Q":
					return "Customizing Task";
				case "G":
					return "Piece List for CTS Project";
				case "M":
					return "Client Transport Request";
				case "P":
					return "Piece List for Upgrade";
				case "D":
					return "Piece List for Support Package";
				case "F":
					return "Piece List";
			}
		},

		onSearchMain: function (evt) {
			var sCurrPage = this.getView().byId("sideNav").getSelectedKey();
			if (sCurrPage === "dataObj") {
				var oSource = this.getView().byId("dataObjContent").getBinding("items");
				var bAsapioOn = this.getView().byId("objectTypeSwitch").getState();
				oSource.bClientOperation = false; //Set Client Operation to true
				oSource.sOperationMode = "Server"; //Set operation mode to Client
				var sQuery = evt.getSource().getValue();
				var oBinding = this.getView().byId("dataObjContent").getBindingInfo("items");
				oBinding.parameters.custom.search = sQuery;
				oBinding.filters = bAsapioOn ? [new sap.ui.model.Filter("CatalogObjectId", sap.ui.model.FilterOperator.StartsWith, "/ASAPIO/")] : [
					new sap.ui.model.Filter("CatalogObjectId", sap.ui.model.FilterOperator.NotStartsWith, "/ASAPIO/")
				];
				this.getView().byId("dataObjContent").bindAggregation("items", oBinding);
				this.getView().byId("dataObjContent").refreshAggregation("items");
			} else if (sCurrPage === "interface") {
				var oSource = this.getView().byId("interfaceContent").getVisible() ?
					this.getView().byId("interfaceContent").getBinding("items") :
					this.getView().byId("interfaceContentTable").getBinding("items");
				oSource.bClientOperation = true; //Set Client Operation to true
				oSource.sOperationMode = "Client"; //Set operation mode to Client
				var sQuery = evt.getSource().getValue();
				if (sQuery) {
					var oFilter = new sap.ui.model.Filter({
						filters: [
							new sap.ui.model.Filter({
								path: "InterfaceId",
								operator: sap.ui.model.FilterOperator.Contains,
								value1: sQuery,
								caseSensitive: false
							}),
							new sap.ui.model.Filter({
								path: "ExtractionView",
								operator: sap.ui.model.FilterOperator.Contains,
								value1: sQuery,
								caseSensitive: false
							}),
							new sap.ui.model.Filter({
								path: "Payload",
								operator: sap.ui.model.FilterOperator.Contains,
								value1: sQuery,
								caseSensitive: false
							}),
							new sap.ui.model.Filter({
								path: "PayloadVersion",
								operator: sap.ui.model.FilterOperator.Contains,
								value1: sQuery,
								caseSensitive: false
							})
						],
						and: false
					});
					oSource.filter(oFilter);
				} else {
					oSource.filter([]);
				}
				if (this.getView().byId("interfaceContent").getVisible()) {
					this.getView().byId("interfaceContent").refreshAggregation("items");
				} else {
					this.getView().byId("interfaceContentTable").refreshAggregation("items");
				}
			}
		},

		handleCDSLinkPress: function (evt) {
			var sLink = "https://api.sap.com/cdsviews/" + evt.getSource().getText();
			URLHelper.redirect(sLink, true);
		},

		handlePayloadPress: function (evt) {
			var sModelPath = aAvailableConnections.find(function (item) {
				return item.key === sModelKey;
			}).url;
			var sLink = sModelPath +
				"/sap/bc/gui/sap/its/webgui?~transaction=%2a%2fasadev%2fdesign%20GV_PAYLOAD_NAME=" + evt.getSource().getText(); //"&sap-client=100&sap-language=EN#";
			URLHelper.redirect(sLink, true);
		},

		deploymentHeadFieldAdd: function () {
			this.getView().getModel("deployment").getProperty("/DataLogToHeaderFields").push({
				Name: "",
				Value: "",
				Mandatory: false,
				isRead: false
			});
			this.getView().getModel("deployment").refresh(true);
		},

		createIntHeadFieldAdd: function () {
			this.getView().getModel("createInterface").getProperty("/InterfacesToHeaderFields").push({
				Name: "",
				Value: "",
				Mandatory: false,
				isRead: false
			});
			this.getView().getModel("createInterface").refresh(true);
		},

		onDeploymentHeadFieldsSelect: function () {
			if (this.getView().byId("deploymentHeaderFields").getSelectedItems().length) {
				this.getView().byId("deleteHeadFields").setEnabled(true);
			} else {
				this.getView().byId("deleteHeadFields").setEnabled(false);
			}
		},

		onCreateIntHeadFieldsSelect: function () {
			if (this.getView().byId("createInterfaceHeaderFields").getSelectedItems().length) {
				this.getView().byId("deleteHeadFieldsInterface").setEnabled(true);
			} else {
				this.getView().byId("deleteHeadFieldsInterface").setEnabled(false);
			}
		},

		deploymentHeadFieldDelete: function () {
			var aItems = this.getView().byId("deploymentHeaderFields").getSelectedItems().reverse(),
				iIndex;
			aItems.forEach(function (item) {
				iIndex = parseInt(item.getBindingContext("deployment").getPath().split("/").pop(), 10);
				this.getView().getModel("deployment").getProperty("/DataLogToHeaderFields").splice(iIndex, 1);
			}.bind(this));
			this.getView().getModel("deployment").refresh(true);
			this.getView().byId("deploymentHeaderFields").removeSelections(true);
			this.getView().byId("deleteHeadFields").setEnabled(false);

			this.isDeploymentFormCorrect();
		},

		createIntHeadFieldDelete: function () {
			var aItems = this.getView().byId("createInterfaceHeaderFields").getSelectedItems().reverse(),
				iIndex;
			aItems.forEach(function (item) {
				iIndex = parseInt(item.getBindingContext("createInterface").getPath().split("/").pop(), 10);
				this.getView().getModel("createInterface").getProperty("/InterfacesToHeaderFields").splice(iIndex, 1);
			}.bind(this));
			this.getView().getModel("createInterface").refresh(true);
			this.getView().byId("createInterfaceHeaderFields").removeSelections(true);
			this.getView().byId("deleteHeadFieldsInterface").setEnabled(false);

			this.isCreateInterfaceFormCorrect();
		},

		uppercaseField: function (evt) {
			evt.getSource().setValue(evt.getSource().getValue().toUpperCase());
			this.validateField(evt);
		},

		onConnectionIdDeplChange: function (evt) {
			var sAdapter = evt.getParameters("selectedItem").selectedItem.getBindingContext().getObject().ConnectorType;
			this._getHeaderAttributes(sAdapter, "deployment");
			if (aSupportedConnectors.includes(sAdapter)) {
				this.getView().byId("deployBtn").setEnabled(true);
			} else {
				this.getView().byId("deployBtn").setEnabled(false);
			}
			this.validateField(evt);
		},

		onConnectionIdCreateIntChange: function (evt) {
			var sAdapter = evt.getParameters("selectedItem").selectedItem.getBindingContext().getObject().ConnectorType;
			this._getHeaderAttributes(sAdapter, "createInterface");
			if (aSupportedConnectors.includes(sAdapter)) {
				this.getView().byId("createInterfaceBtn").setEnabled(true);
			} else {
				this.getView().byId("createInterfaceBtn").setEnabled(false);
			}
			this.validateField(evt);
		},

		_getHeaderAttributes: function (sAdapter, sModelName) {
			var aFilters = [new sap.ui.model.Filter("Adapter", sap.ui.model.FilterOperator.EQ, sAdapter)];
			this.getView().getModel().read("/HeaderAttributesSet", {
				filters: aFilters,
				success: function (oData) {
					if (oData.results.length) {
						var sProperty = sModelName === "deployment" ? "DataLogToHeaderFields" : "InterfacesToHeaderFields",
							sTableId = sModelName === "deployment" ? "deploymentHeaderFields" : "createInterfaceHeaderFields";
						if (sModelName === "deployment" || (sModelName === "createInterface" && this.getView().getModel(sModelName).getProperty(
							"/LoadType") === "I")) {
							this.getView().getModel(sModelName).setProperty("/" + sProperty, []);
						} else {
							if (!this.getView().getModel("createInterface").getProperty("/savedHeaderFields")) {
								this.getView().getModel("createInterface").setProperty("/savedHeaderFields", this.getView().getModel("createInterface").getProperty(
									"/InterfacesToHeaderFields").slice());
							}
							this.getView().getModel("createInterface").setProperty("/InterfacesToHeaderFields", this.getView().getModel(
								"createInterface").getProperty("/savedHeaderFields").slice());
						}
						oData.results.forEach(function (item) {
							this.getView().getModel(sModelName).getProperty("/" + sProperty).push({
								Name: item.Attribute,
								Value: "",
								Mandatory: item.Mandatory ? true : false,
								isRead: true
							});
						}.bind(this));
						this.getView().getModel(sModelName).refresh(true);
						this.getView().byId(sTableId).getItems().forEach(function (item) {
							item.addStyleClass("nonSelectable");
						});
					} else {
						this.getView().getModel(sModelName).setProperty("/" + sProperty, []);
						this.getView().getModel(sModelName).refresh(true);
					}
				}.bind(this),
				error: function (oError) {
					MessageBox.error(JSON.parse(oError.responseText).error.message.value);
				}.bind(this)
			});
		},

		_getHeaderFields: function (sConnectionId, sInterfaceId) {
			var aFilters = [new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter("ConnectionId", sap.ui.model.FilterOperator.EQ, sConnectionId),
					new sap.ui.model.Filter("InterfaceId", sap.ui.model.FilterOperator.EQ, sInterfaceId),
				],
				and: true
			})];
			this.getView().getModel().read("/HeaderFieldsSet", {
				filters: aFilters,
				success: function (oData) {
					if (oData.results.length) {
						oData.results.forEach(function (item) {
							this.getView().getModel("deployment").getProperty("/DataLogToHeaderFields").push({
								Name: item.Name,
								Value: item.Value,
								Mandatory: item.Mandatory ? true : false,
								isRead: true
							});
						}.bind(this));
						this.getView().getModel("deployment").refresh(true);
						this.getView().byId("deploymentHeaderFields").getItems().forEach(function (item) {
							item.addStyleClass("nonSelectable");
						});
					}
				}.bind(this),
				error: function (oError) {
					MessageBox.error(JSON.parse(oError.responseText).error.message.value);
				}.bind(this)
			});
		},

		onCreateInterfaceLoadTypeChanged: function (evt) {
			var sKey = evt.getSource().getSelectedKey();
			if (sKey === "P") {
				this.getView().getModel("createInterface").setProperty("/InterfacesToHeaderFields", this.getView().getModel("createInterface").getProperty(
					"/savedHeaderFields").concat(this.getView().getModel("createInterface").getProperty("/InterfacesToHeaderFields")));
			} else {
				this.getView().getModel("createInterface").setProperty("/savedHeaderFields", this.getView().getModel("createInterface").getProperty(
					"/InterfacesToHeaderFields").filter(function (item) {
						return item.isPredefined === true;
					}));
				this.getView().getModel("createInterface").setProperty("/InterfacesToHeaderFields", this.getView().getModel("createInterface").getProperty(
					"/InterfacesToHeaderFields").filter(function (item) {
						return !item.isPredefined;
					}));
			}
		},

		onInterfaceCreatePress: function () {
			var oCreateInt = JSON.parse(JSON.stringify(this.getView().getModel("createInterface").getData()));
			if (this.isCreateInterfaceFormCorrect()) {
				oCreateInt.InterfacesToHeaderFields.forEach(function (item) {
					if (item.Mandatory) {
						item.Mandatory = "X";
					} else {
						item.Mandatory = " ";
					}
					if (item.Value === "") {
						delete item.Value;
					}
					delete item.isRead;
					delete item.isPredefined;
					item.ConnectionId = oCreateInt.ConnectionId;
					item.InterfaceId = oCreateInt.InterfaceId;
				});
				delete oCreateInt.savedHeaderFields;
				if (oCreateInt[undefined]) {
					delete oCreateInt[undefined];
				}

				this.getView().getModel().create("/InterfacesSet", oCreateInt, {
					success: function () {
						this.getView().getModel("createInterface").setData({
							ConnectionId: "",
							InterfaceId: "",
							InterfacesToHeaderFields: [{
								Name: "ACI_PACK_TABLE",
								Value: "",
								Mandatory: true,
								isPredefined: true
							}, {
								Name: "ACI_PACK_RETRY_TIME",
								Value: "",
								Mandatory: false,
								isPredefined: true
							}, {
								Name: "ACI_PACK_WHERE_COND",
								Value: "",
								Mandatory: false,
								isPredefined: true
							}, {
								Name: "ACI_PACK_SIZE",
								Value: "",
								Mandatory: true,
								isPredefined: true
							}, {
								Name: "ACI_PACK_KEY_LENGTH",
								Value: "",
								Mandatory: true,
								isPredefined: true
							}],
							LoadType: "P",
							Type: ""
						});
						this.getView().getModel("createInterface").refresh(true);
						this.byId("pageContainer").to(this.getView().createId("interface"));
						HashChanger.setHash("Interfaces");
						this.getView().byId("interfaceContentTable").getBinding("items").refresh(true);
						if (oCreateInt.LoadType === "I") {
							MessageBox.success(
								"Interface was created successfully. Please proceed to the SAP system to define the trigger and complete the extraction configuration."
							);
						}
					}.bind(this),
					error: function (oError) {
						MessageBox.error("Error occured during interface creation process: " + JSON.parse(oError.responseText).error.message.value);
					}.bind(this)
				});
			}
		},

		onDeploymentPress: function () {
			var oDeploy = JSON.parse(JSON.stringify(this.getView().getModel("deployment").getData()));
			if (this.isDeploymentFormCorrect()) {
				if (oDeploy.__metadata) {
					delete oDeploy.__metadata;
				}
				if (oDeploy.hasOwnProperty("entryExists")) {
					delete oDeploy.entryExists;
				}
				if (oDeploy.hasOwnProperty("undefined")) {
					delete oDeploy.undefined;
				}
				oDeploy.DataLogToHeaderFields.forEach(function (item) {
					if (item.Mandatory) {
						item.Mandatory = "X";
					} else {
						item.Mandatory = " ";
					}
					if (item.Value === "") {
						delete item.Value;
					}
					delete item.isRead;
					item.ConnectionId = oDeploy.ConnectionId;
					item.InterfaceId = oDeploy.InterfaceId;
				});
				this.getView().getModel().create("/DataActivationLog", oDeploy, {
					success: function () {
						this.getView().getModel("deployment").setData(JSON.parse(JSON.stringify(oDeploymentDefault)));
						this.getView().getModel("deployment").refresh(true);
						if (HashChanger.getHash().includes("DataCatalog")) {
							this.byId("pageContainer").to(this.getView().createId("dataObjDetails"));
							HashChanger.setHash("DataCatalog/" + oBindContext.getPath().replace("/DataCatalogSet", "Object"));
							this.getView().byId("dataObjDetails").setBindingContext(oBindContext);
							this.getView().byId("objToLog").getBindingContext().getModel().refresh(true);
						} else {
							this.byId("pageContainer").to(this.getView().createId("interfaceDetails"));
							HashChanger.setHash("Interfaces/" + oBindContext.getPath().replace("/InterfacesSet", "Interface"));
							this.getView().byId("interfaceDetails").setBindingContext(oBindContext);
							this.getView().byId("interfaceToLog").getBindingContext().getModel().refresh(true);
						}
					}.bind(this),
					error: function (oError) {
						//MessageToast.show("Error occured during deployment process.");
						MessageBox.error("Error occured during deployment process: " + JSON.parse(oError.responseText).error.message.value);
					}.bind(this)
				});
			}
		},

		isCreateInterfaceFormCorrect: function () {
			// Reset all states
			var bCorrect = true;
			this.getView().byId("createInterfaceId").setValueState("None");
			this.getView().byId("createInterfaceConnectionId").setValueState("None");
			this.getView().byId("createInterfaceLoadType").setValueState("None");
			this.getView().byId("createInterfaceHeaderFields").getItems().forEach(function (row) {
				row.getCells().forEach(function (cell) {
					if (cell.getMetadata()._sClassName === "sap.m.Input") {
						cell.setValueState("None");
					}
				});
			});
			if (!this.getView().byId("createInterfaceConnectionId").getSelectedKey()) {
				this.getView().byId("createInterfaceConnectionId").setValueState("Error");
				bCorrect = false;
			}
			if (!this.getView().byId("createInterfaceId").getValue()) {
				this.getView().byId("createInterfaceId").setValueState("Error");
				bCorrect = false;
			}
			if (!this.getView().byId("createInterfaceLoadType").getSelectedKey()) {
				this.getView().byId("createInterfaceLoadType").setValueState("Error");
				bCorrect = false;
			}
			var bHeaderFieldsEmpty = false;
			this.getView().byId("createInterfaceHeaderFields").getItems().forEach(function (row) {
				if (!row.getCells()[0].getValue()) {
					row.getCells()[0].setValueState("Error");
					bCorrect = false;
				}
				if (row.getBindingContext("createInterface").getObject().Mandatory) {
					row.getCells().forEach(function (cell) {
						if (cell.getMetadata()._sClassName === "sap.m.Input" && !cell.getValue()) {
							cell.setValueState("Error");
							bCorrect = false;
						}
					});
				}
			});
			return bCorrect;
		},

		isDeploymentFormCorrect: function () {
			// Reset all states
			var bCorrect = true;
			this.getView().byId("deploymentConnectionId").setValueState("None");
			this.getView().byId("deploymentInterfaceId").setValueState("None");
			this.getView().byId("deploymentLoadType").setValueState("None");
			this.getView().byId("deploymentHeaderFields").getItems().forEach(function (row) {
				row.getCells().forEach(function (cell) {
					if (cell.getMetadata()._sClassName === "sap.m.Input") {
						cell.setValueState("None");
					}
				});
			});
			if (!this.getView().byId("deploymentConnectionId").getSelectedKey()) {
				this.getView().byId("deploymentConnectionId").setValueState("Error");
				bCorrect = false;
			}
			if (!this.getView().byId("deploymentInterfaceId").getValue()) {
				this.getView().byId("deploymentInterfaceId").setValueState("Error");
				bCorrect = false;
			}
			if (!this.getView().byId("deploymentLoadType").getSelectedKey()) {
				this.getView().byId("deploymentLoadType").setValueState("Error");
				bCorrect = false;
			}
			var bHeaderFieldsEmpty = false;
			this.getView().byId("deploymentHeaderFields").getItems().forEach(function (row) {
				if (!row.getCells()[0].getValue()) {
					row.getCells()[0].setValueState("Error");
					bCorrect = false;
				}
				if (row.getBindingContext("deployment").getObject().Mandatory) {
					row.getCells().forEach(function (cell) {
						if (cell.getMetadata()._sClassName === "sap.m.Input" && !cell.getValue()) {
							cell.setValueState("Error");
							bCorrect = false;
						}
					});
				}
			});
			return bCorrect;
		},

		onUndeployPress: function () {
			MessageBox.confirm("Do you want to undeploy the entry?", {
				onClose: function (opt) {
					if (opt === "OK") {
						var oData = this.getView().getModel("deployment").getData();
						this.getView().getModel().callFunction("/DeactivateInstance", {
							urlParameters: {
								CatalogObjectId: oData.CatalogObjectId,
								CatalogObjectVersion: oData.CatalogObjectVersion,
								ConnectionId: oData.ConnectionId,
								EventType: oData.EventType,
								EventName: oData.EventName,
								InterfaceId: oData.InterfaceId,
								ObjectName: oData.ObjectName,
								LoadType: oData.LoadType
							},
							method: "GET",
							success: function () {
								if (HashChanger.getHash().includes("DataCatalog")) {
									this.byId("pageContainer").to(this.getView().createId("dataObjDetails"));
									HashChanger.setHash("DataCatalog/" + oBindContext.getPath().replace("/DataCatalogSet", "Object"));
									this.getView().byId("dataObjDetails").setBindingContext(oBindContext);
									this.getView().byId("objToLog").getBindingContext().getModel().refresh(true);
								} else {
									this.byId("pageContainer").to(this.getView().createId("interface"));
									HashChanger.setHash("Interfaces");
								}
							}.bind(this),
							error: function (oError) {
								MessageBox.error(JSON.parse(oError.responseText).error.message.value);
							}
						});
					}
				}.bind(this)
			});
		},

		objToLogItemPress: function (evt, sPage) {
			oBindContext = sPage === "dataObjDetails" ? this.getView().byId("dataObjDetails").getBindingContext() : this.getView().byId(
				"interfaceDetails").getBindingContext();
			var sLinkText = sPage === "dataObjDetails" ? oBindContext.getObject().Description : oBindContext.getObject().InterfaceId;
			this.getView().byId("dataObjLinkMainDeploy").setText(sLinkText);
			if (sPage !== "dataObjDetails") {
				this.getView().byId("dataObjLinkAllDeploy").setText("Interfaces");
			}
			var oBindObj = evt.getSource().getBindingContext().getObject();
			var sPath = evt.getSource().getBindingContext().getPath();

			this._setDeployPage(oBindContext, oBindObj);

			this.byId("pageContainer").to(this.getView().createId("deploy"));
			HashChanger.setHash(HashChanger.getHash() + sPath.replace("DataActivationLog", "Deploy"));
		},

		_setDeployPage: function (oBindContext, oBindObj) {
			this.getView().byId("deploymentConnectionId").setForceSelection(true);
			Object.keys(oBindObj).forEach(function (prop) {
				this.getView().getModel("deployment").setProperty("/" + prop, oBindObj[prop]);
			}.bind(this));
			this.getView().getModel("deployment").setProperty("/DataLogToHeaderFields", []);
			this.getView().getModel("deployment").setProperty("/entryExists", true);
			this._getHeaderFields(oBindObj.ConnectionId, oBindObj.InterfaceId);
			this.getView().byId("dataObjLinkMainDeploy").attachEventOnce("press", function () {
				this.getView().getModel("deployment").setData(JSON.parse(JSON.stringify(oDeploymentDefault)));
				this.getView().getModel("deployment").refresh(true);
			}.bind(this));

			if (this.getView().byId("deploymentConnectionId").getSelectedItem()) {
				var sConnType = this.getView().byId("deploymentConnectionId").getSelectedItem().getBindingContext().getObject().ConnectorType;
				if (sConnType && aSupportedConnectors.includes(sConnType)) {
					this.getView().byId("deployBtn").setEnabled(true);
				} else {
					this.getView().byId("deployBtn").setEnabled(false);
				}
			}
		},

		validateField: function (evt) {
			var sValue = evt.getSource().getMetadata()._sClassName === "sap.m.Input" ?
				evt.getSource().getValue() : evt.getSource().getSelectedKey();
			if (!sValue) {
				evt.getSource().setValueState("Error");
			} else {
				evt.getSource().setValueState("None");
			}
		},

		grouper: function (oGroup) {
			if (oGroup.sPath.includes("DataCatalogSet")) {
				return {
					key: oGroup.oModel.oData[oGroup.sPath.split("/")[1]].Description.slice(0, 1)
				};
			} else if (oGroup.sPath.includes("InterfacesSet")) {
				return {
					key: oGroup.oModel.oData[oGroup.sPath.split("/")[1]].InterfaceId.slice(0, 1)
				};
			}
		},

		getGroupHeader: function (oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key,
				upperCase: true
			});

		},

		asyncAPIInterfaceChanged: function (evt) {
			var oBindObj = evt.getParameter("selectedItem").getBindingContext("helperModel").getObject(),
				sKey = this.getView().getModel().createKey("/AsyncAPISet", {
					ConnectionId: oBindObj.ConnectionId,
					InterfaceId: oBindObj.InterfaceId
				}),
				oTextArea = evt.getSource().getParent().getParent().getItems()[1];

			this.getView().getModel().read(sKey, {
				success: function (oData) {
					var oResult = JSON.parse(oData.JSONString);
					var sValue = JSON.stringify(oResult, null, 4);
					oTextArea.setValue(sValue);
				},
				error: function (oError) {
					MessageBox.error(JSON.parse(oError.responseText).error.message.value);
				}
			});
		},

		onAsyncAPICopy: function () {
			var sId = this.getView().byId("pageContainer").getCurrentPage().getId().includes("interface") ? "interfaceAsyncAPIstring" :
				"asyncAPIstring";
			var text = this.getView().byId(sId).getValue();
			navigator.clipboard.writeText(text).then(function () {
				MessageToast.show("Data is copied to the clipboard");
			}, function (err) {
				MessageToast.show('Could not copy text: ', err);
			});
		},

		onAsyncAPIDownload: function () {
			var sId = this.getView().byId("pageContainer").getCurrentPage().getId().includes("interface") ? "interfaceAsyncAPIstring" :
				"asyncAPIstring";
			var text = this.getView().byId(sId).getValue();
			File.save(text, 'AsyncAPI', 'json', 'application/json', null, null);
		},

		onConnectionIdInterfaceChange: function (evt) {
			var sConnectionId = evt.getSource().getSelectedKey(),
				oItemsGrid = this.getView().byId("interfaceContent"),
				oItemsTable = this.getView().byId("interfaceContentTable");
			oItemsGrid.getBinding("items").filter([new sap.ui.model.Filter("ConnectionId", sap.ui.model.FilterOperator.EQ, sConnectionId)]);
			oItemsGrid.refreshAggregation("items");
			oItemsTable.getBinding("items").filter([new sap.ui.model.Filter("ConnectionId", sap.ui.model.FilterOperator.EQ, sConnectionId)]);
			oItemsTable.refreshAggregation("items");
		},

		onConnectionsEdit: function () {
			var sModelPath = aAvailableConnections.find(function (item) {
				return item.key === sModelKey;
			}).url;
			var sLink = sModelPath +
				"/sap/bc/gui/sap/its/webgui?~transaction=*/asadev/aci_settings#";
			URLHelper.redirect(sLink, true);
		},

		onEvtCreate: function () {
			if (!this.oCreateEvtDialog) {
				this.oCreateEvtDialog = new sap.m.Dialog({
					contentWidth: "350px",
					title: "Create event",
					content: new sap.ui.layout.form.SimpleForm({
						editable: true,
						content: [
							new sap.m.Label({
								required: true,
								text: "Catalog Object ID"
							}),
							new sap.m.Input({

							}).bindProperty("value", "helperModel>/createEvt/CatalogObjectId"),
							new sap.m.Label({
								required: true,
								text: "Catalog Object Version"
							}),
							new sap.m.Input({

							}).bindProperty("value", "helperModel>/createEvt/CatalogObjectVersion"),
							new sap.m.Label({
								required: true,
								text: "Event Type"
							}),
							new sap.m.Select({
								forceSelection: false,
								items: [
									new sap.ui.core.Item({
										key: "BO",
										text: "Business Object"
									}),
									new sap.ui.core.Item({
										key: "RA",
										text: "RAP Business Object"
									}),
									new sap.ui.core.Item({
										key: "CL",
										text: "ABAP Class"
									})
								]
							}).bindProperty("selectedKey", "helperModel>/createEvt/EventType"),
							new sap.m.Label({
								required: true,
								text: "Object ID"
							}),
							new sap.m.Input({

							}).bindProperty("value", "helperModel>/createEvt/ObjectId"),
							new sap.m.Label({
								required: true,
								text: "Event Name"
							}),
							new sap.m.Input().bindProperty("value", "helperModel>/createEvt/EventName"),
							new sap.m.Label({
								text: "Class Name"
							}),
							new sap.m.Input().bindProperty("value", "helperModel>/createEvt/ClassName"),
						]
					}),
					beginButton: new sap.m.Button({
						type: lib.ButtonType.Emphasized,
						text: "OK",
						press: function () {
							var oData = this.getView().getModel("helperModel").getProperty("/createEvt");
							if (Object.keys(oData).length === 6 || (Object.keys(oData).length === 5 && !oData.ClassName)) {
								this.getView().getModel().create("/DataEventSet", oData, {
									success: function (oData) {
										this.oCreateEvtDialog.close();
										MessageBox.success("Event was created successfully.");
										this.getView().getModel("helperModel").setProperty("/createEvt", {});
										this.getView().byId("predefEventsTable").getBinding("items").refresh(true);
									}.bind(this),
									error: function (oError) {
										MessageBox.error(JSON.parse(oError.responseText).error.message.value);
									}.bind(this)
								});
							} else {
								MessageToast.show("Please fill in all required fields");
							}
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: "Close",
						press: function () {
							this.oCreateEvtDialog.close();
						}.bind(this)
					})
				});
				this.getView().addDependent(this.oCreateEvtDialog);
				this.oCreateEvtDialog.addStyleClass("sapUiSizeCompact sapUiResponsivePadding--content");
			}
			this.oCreateEvtDialog.open();
		},

		onPredefEventSelect: function () {
			this.getView().byId("deletePredefEvent").setEnabled(true);
		},

		onEvtDelete: function () {
			var oItem = this.getView().byId("predefEventsTable").getSelectedItem();
			if (oItem) {
				MessageBox.confirm("Do you want to delete the selected event?", {
					onClose: function (opt) {
						if (opt === "OK") {
							var sPath = oItem.getBindingContext().getPath();
							this.getView().getModel().remove(sPath, {
								success: function () {
									MessageToast.show("Selected event was successfully deleted.");
								},
								error: function (oError) {
									MessageBox.error(JSON.parse(oError.responseText).error.message.value);
								}
							})
						}
					}.bind(this)
				});
			}
		},

		onPredefEventNav: function (evt) {
			this.byId("pageContainer").to(this.getView().createId("predefEventDetails"));
			HashChanger.setHash("Events/" + evt.getSource().getBindingContext().getPath().replace("/DataEventSet", "Event"));
			this.getView().byId("predefEventDetails").setBindingContext(evt.getSource().getBindingContext());
		},

		onPredefEventEditPress: function () {
			this.getView().byId("predefEventDisplayForm").setVisible(false);
			this.getView().byId("predefEventEditForm").setVisible(true);
		},

		onPredefEventCancelPress: function () {
			this.getView().byId("predefEventDisplayForm").setVisible(true);
			this.getView().byId("predefEventEditForm").setVisible(false);
		},

		onPredefEventSavePress: function () {
			var oUpload = {},
				oBindObj = this.getView().byId("predefEventEditForm").getBindingContext().getObject();
			delete oBindObj.__metadata;
			delete oBindObj.ObjectName;
			this.getView().byId("predefEventEditForm").getContent().forEach(function (formEl) {
				if (formEl.getMetadata()._sClassName === "sap.m.Input") {
					oUpload[formEl.getBinding("value").getPath()] = formEl.getValue();
				}
				if (formEl.getMetadata()._sClassName === "sap.m.Select") {
					oUpload[formEl.getBinding("selectedKey").getPath()] = formEl.getSelectedKey();
				}
			}.bind(this));
			if (JSON.stringify(oBindObj) !== JSON.stringify(oUpload)) {
				this.getView().getModel().update(this.getView().byId("predefEventEditForm").getBindingContext().getPath(), oUpload, {
					success: function (oData) {
						var sKey = this.getView().getModel().createKey("/DataEventSet", oUpload),
							oModel = this.getView().getModel();
						this.getView().byId("predefEventDetails").setBindingContext(new sap.ui.model.Context(oModel, sKey));
						this.getView().byId("predefEventDisplayForm").setVisible(true);
						this.getView().byId("predefEventEditForm").setVisible(false);
					}.bind(this),
					error: function (oError) {
						MessageBox.error(JSON.parse(oError.responseText).error.message.value);
					}
				});
			}
		},

		onInterfaceDisplayModeChanged: function (evt) {
			var sKey = evt.getParameter("selectedItem").getKey();
			if (sKey === "table") {
				this.getView().byId("interfaceContent").setVisible(false);
				this.getView().byId("interfaceContentTable").setVisible(true);
			} else {
				this.getView().byId("interfaceContentTable").removeSelections(true);
				this.getView().byId("interfaceContentTable").setVisible(false);
				this.getView().byId("interfaceContent").setVisible(true);
			}
		},

		onMonitorDateChanged: function (evt) {
			if (this.getView().byId("monitorTimestampFromPicker").getDateValue() && this.getView().byId("monitorTimestampToPicker").getDateValue()) {
				this.getView().setBusy(true);
				var sDateFrom = this.getView().byId("monitorTimestampFromPicker").getDateValue().toISOString().replace(/[\-\:T]/g, "").split(".")[
					0],
					sDateTo = this.getView().byId("monitorTimestampToPicker").getDateValue().toISOString().replace(/[\-\:T]/g, "").split(".")[0]
				this.getView().getModel().callFunction("/GetMonitoringData", {
					urlParameters: {
						"TimestampFrom": sDateFrom,
						"TimestampTo": sDateTo
					},
					method: "GET",
					success: function (oData) {
						oData.results.forEach(function (item) {
							item.TimestampDate = this.timestampToDate(item.Timestamp);
							item.DataPrepTime = item.DataLoadS !== "0" && item.DataLoadE !== "0" ? this.dateDiffSec(item.DataLoadS, item.DataLoadE) :
								"";
							item.CloudCallTime = item.DataSendS !== "0" && item.DataSendS !== "0" ? this.dateDiffSec(item.DataSendS, item.DataSendE) :
								"";
							item.DataProcTime = item.DataProcS !== "0" && item.DataProcS !== "0" ? this.dateDiffSec(item.DataProcS, item.DataProcE) :
								"";
						}.bind(this));
						this.getView().getModel("helperModel").setProperty("/monitoringData", oData.results);
						this.getView().getModel("helperModel").refresh(true);
						this.getView().byId("monitorBC").setCurrentLocationText("Monitoring (" + oData.results.length + ")");
						this.getView().setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.getView().setBusy(false);
						MessageBox.error(JSON.parse(oError.responseText).error.message.value);
					}.bind(this)
				});
			} else {
				MessageBox.error("Please enter timestamps to proceed.");
			}
		},

		timestampToDate: function (timestamp) {
			return new Date(
				timestamp.slice(0, 4), // Year
				timestamp.slice(4, 6) - 1, // Month (0-indexed)
				timestamp.slice(6, 8), // Day
				timestamp.slice(8, 10), // Hours
				timestamp.slice(10, 12), // Minutes
				timestamp.slice(12, 14) // Seconds
			);
		},

		dateDiffSec: function (timestamp1, timestamp2) {
			// Calculate the difference in milliseconds
			var date1 = this.timestampToDate(timestamp1),
				date2 = this.timestampToDate(timestamp2);
			var differenceInMilliseconds = Math.abs(date2 - date1);
			// Convert milliseconds to seconds
			var differenceInSeconds = differenceInMilliseconds / 1000;
			//return differenceInSeconds;

			// Calculate hours, minutes, and seconds
			var hours = Math.floor(differenceInSeconds / 3600); // 1 hour = 3600 seconds
			var minutes = Math.floor((differenceInSeconds % 3600) / 60); // 1 minute = 60 seconds
			var remainingSeconds = differenceInSeconds % 60;

			// Pad the values with leading zeros if necessary
			hours = hours.toString().padStart(2, '0');
			minutes = minutes.toString().padStart(2, '0');
			remainingSeconds = remainingSeconds.toString().padStart(2, '0');

			// Return the formatted string
			return hours + ':' + minutes + ':' + remainingSeconds;
		},

		onMonitoringLineSelected: function (evt) {
			this.getView().byId("monitoringTopSplit").setSize("50%");
			var oBindObj = evt.getSource().getBindingContext("helperModel").getObject(),
				sTDName = oBindObj.LogHandle + oBindObj.Object;

			this.getView().getModel().callFunction("/GetTraces", {
				urlParameters: {
					"TDName": sTDName
				},
				method: "GET",
				success: function (oData) {
					var oRQ = oData.results.find(function (obj) {
						return obj.ID === "RQ";
					});
					if (oRQ) {
						this.getView().byId("traceRQ").setValue(oRQ.TraceString.slice(1).replace(/\\n/g, "&#13;&#10;"));
					} else {
						this.getView().byId("traceRQ").setValue("");
					}

					var oRS = oData.results.find(function (obj) {
						return obj.ID === "RS";
					});
					if (oRS) {
						this.getView().byId("traceRS").setValue(oRS.TraceString.slice(1).replace(/\\n/g, "&#13;&#10;"));
					} else {
						this.getView().byId("traceRS").setValue("");
					}
				}.bind(this),
				error: function (oError) {
					MessageBox.error(JSON.parse(oError.responseText).error.message.value);
				}.bind(this)
			});
		},

		onTracesClose: function (evt) {
			this.getView().byId("monitoringTopSplit").setSize("100%");
		},

		onTracesRQSave: function (evt) {
			File.save(this.getView().byId("traceRQ").getValue(), 'Request', 'txt', 'text/plain', null, null);
		},

		onTracesRSSave: function (evt) {
			File.save(this.getView().byId("traceRS").getValue(), 'Response', 'txt', 'text/plain', null, null);
		}
	});
});