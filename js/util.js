/**
 * @file
 * Provides utility functions for Quick Edit.
 */

(function ($, Backdrop, backdropSettings) {

  "use strict";

  Backdrop.quickedit.util = Backdrop.quickedit.util || {};

  Backdrop.quickedit.util.constants = {};
  Backdrop.quickedit.util.constants.transitionEnd = "transitionEnd.quickedit webkitTransitionEnd.quickedit transitionend.quickedit msTransitionEnd.quickedit oTransitionEnd.quickedit";

  /**
   * Converts a field id into a formatted url path.
   *
   * @param String id
   *   The id of an editable field. For example, 'node/1/body/und/full'.
   * @param String urlFormat
   *   The Controller route for field processing. For example,
   *   '/quickedit/form/%21entity_type/%21id/%21field_name/%21langcode/%21view_mode'.
   */
  Backdrop.quickedit.util.buildUrl = function (id, urlFormat) {
    var parts = id.split('/');
    return Backdrop.formatString(decodeURIComponent(urlFormat), {
      '!entity_type': parts[0],
      '!id'         : parts[1],
      '!field_name' : parts[2],
      '!langcode'   : parts[3],
      '!view_mode'  : parts[4]
    });
  };

  /**
   * Shows a network error modal dialog.
   *
   * @param String title
   *   The title to use in the modal dialog.
   * @param String message
   *   The message to use in the modal dialog.
   */
  Backdrop.quickedit.util.networkErrorModal = function (title, message) {
    var networkErrorModal = new Backdrop.quickedit.ModalView({
      title: title,
      dialogClass: 'quickedit-network-error',
      message: message,
      buttons: [
        {
          action: 'ok',
          type: 'submit',
          classes: 'action-save quickedit-button',
          label: Backdrop.t('OK')
        }
      ],
      callback: function () { return; }
    });
    networkErrorModal.render();
  };

  Backdrop.quickedit.util.form = {

    /**
     * Loads a form, calls a callback to insert.
     *
     * Leverages Backdrop.ajax' ability to have scoped (per-instance) command
     * implementations to be able to call a callback.
     *
     * @param Object options
     *   An object with the following keys:
     *    - jQuery $el: (required) DOM element necessary for Backdrop.ajax to
     *      perform AJAX commands.
     *    - String fieldID: (required) the field ID that uniquely identifies the
     *      field for which this form will be loaded.
     *    - Boolean nocssjs: (required) boolean indicating whether no CSS and JS
     *      should be returned (necessary when the form is invisible to the user).
     *    - Boolean reset: (required) boolean indicating whether the data stored
     *      for this field's entity in TempStore should be used or reset.
     * @param Function callback
     *   A callback function that will receive the form to be inserted, as well as
     *   the ajax object, necessary if the callback wants to perform other AJAX
     *   commands.
     */
    load: function (options, callback) {
      var $el = options.$el;
      var fieldID = options.fieldID;

      // Create a Backdrop.ajax instance to load the form.
      var formLoaderAjax = new Backdrop.ajax(fieldID, $el, {
        url: Backdrop.quickedit.util.buildUrl(fieldID, backdropSettings.quickedit.fieldFormURL),
        event: 'quickedit-internal.quickedit',
        submit: {
          nocssjs : options.nocssjs,
          reset : options.reset
        },
        progress: { type : null }, // No progress indicator.
        error: function (xhr, url) {
          $el.off('quickedit-internal.quickedit');

          // Show a modal to inform the user of the network error.
          var fieldLabel = Backdrop.quickedit.metadata.get(fieldID, 'label');
          var message = Backdrop.t('Could not load the form for <q>@field-label</q>, either due to a website problem or a network connection problem.<br>Please try again.', { '@field-label' : fieldLabel });
          Backdrop.quickedit.util.networkErrorModal(Backdrop.t('Sorry!'), message);

          // Change the state back to "candidate", to allow the user to start
          // in-place editing of the field again.
          var fieldModel = Backdrop.quickedit.app.model.get('activeField');
          fieldModel.set('state', 'candidate');
        }
      });
      // Work-around for https://drupal.org/node/2019481 in Drupal 7.
      formLoaderAjax.commands = {};
      // The above work-around prevents the prototype implementations from being
      // called, so we must alias any and all of the commands that might be called.
      formLoaderAjax.commands.settings = Backdrop.ajax.prototype.commands.settings;
      formLoaderAjax.commands.insert = Backdrop.ajax.prototype.commands.insert;
      // Implement a scoped quickeditFieldForm AJAX command: calls the callback.
      formLoaderAjax.commands.quickeditFieldForm = function (ajax, response, status) {
        callback(response.data, ajax);
        $el.off('quickedit-internal.quickedit');
        formLoaderAjax = null;
      };
      // This will ensure our scoped quickeditFieldForm AJAX command gets called.
      $el.trigger('quickedit-internal.quickedit');
    },

    /**
     * Creates a Backdrop.ajax instance that is used to save a form.
     *
     * @param Object options
     *   An object with the following keys:
     *    - nocssjs: (required) boolean indicating whether no CSS and JS should be
     *      returned (necessary when the form is invisible to the user).
     *    - other_view_modes: (required) array containing view mode IDs (of other
     *      instances of this field on the page).
     * @return Backdrop.ajax
     *   A Backdrop.ajax instance.
     */
    ajaxifySaving: function (options, $submit) {
      // Re-wire the form to handle submit.
      var settings = {
        url: $submit.closest('form').attr('action'),
        setClick: true,
        event: 'click.quickedit',
        progress: { type: null },
        submit: {
          nocssjs : options.nocssjs,
          other_view_modes : options.other_view_modes
        },
        // Reimplement the success handler to ensure Backdrop.attachBehaviors() does
        // not get called on the form.
        success: function (response, status) {
          for (var i in response) {
            if (response.hasOwnProperty(i) && response[i].command && this.commands[response[i].command]) {
              this.commands[response[i].command](this, response[i], status);
            }
          }
        }
      };

      return new Backdrop.ajax($submit.attr('id'), $submit[0], settings);
    },

    /**
     * Cleans up the Backdrop.ajax instance that is used to save the form.
     *
     * @param Backdrop.ajax ajax
     *   A Backdrop.ajax that was returned by Backdrop.quickedit.form.ajaxifySaving().
     */
    unajaxifySaving: function (ajax) {
      $(ajax.element).off('click.quickedit');
    }

  };

  /**
   * Limits the invocations of a function in a given time frame.
   *
   * Adapted from underscore.js with the addition Backdrop namespace.
   *
   * The debounce function wrapper should be used sparingly. One clear use case
   * is limiting the invocation of a callback attached to the window resize event.
   *
   * Before using the debounce function wrapper, consider first whether the
   * callback could be attache to an event that fires less frequently or if the
   * function can be written in such a way that it is only invoked under specific
   * conditions.
   *
   * @param {Function} callback
   *   The function to be invoked.
   *
   * @param {Number} wait
   *   The time period within which the callback function should only be
   *   invoked once. For example if the wait period is 250ms, then the callback
   *   will only be called at most 4 times per second.
   *
   * @see Drupal 8's core/misc/debounce.js.
   */
  Backdrop.quickedit.util.debounce = function (func, wait, immediate) {
    var timeout, result;
    return function () {
      var context = this;
      var args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
      }
      return result;
    };
  };

})(jQuery, Backdrop, Backdrop.settings);
