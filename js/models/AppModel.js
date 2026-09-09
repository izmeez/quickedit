/**
 * @file
 * A Backbone Model for the state of the in-place editing application.
 *
 * @see Backdrop.quickedit.AppView
 */

(function (Backbone, Backdrop) {

  "use strict";

  Backdrop.quickedit.AppModel = Backbone.Model.extend({

    defaults: {
      // The currently state = 'highlighted' Backdrop.quickedit.FieldModel, if any.
      // @see Backdrop.quickedit.FieldModel.states
      highlightedField: null,
      // The currently state = 'active' Backdrop.quickedit.FieldModel, if any.
      // @see Backdrop.quickedit.FieldModel.states
      activeField: null,
      // Reference to a Backdrop.quickedit.ModalView instance if a state change
      // requires confirmation.
      activeModal: null
    }

  });

}(Backbone, Backdrop));
