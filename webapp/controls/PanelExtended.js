sap.ui.define([
	"sap/m/Panel"
], function (Panel) {
	"use strict";
	return Panel.extend("asapio.datastudio.controls.PanelExtended", {
		metadata: {
			events: {
				"press": {
					allowPreventDefault: true
				}
			},
			renderer: null
		},
		init: function () {
			Panel.prototype.init.call(this);
		},
		onclick: function () {
			
			this.firePress();
		},
		renderer: function (oRm, oPanel) {
			sap.m.PanelRenderer.render(oRm, oPanel);
		}
	});
});