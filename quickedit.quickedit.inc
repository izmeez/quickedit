<?php

/**
 * @file
 * Quick Edit hooks implemented by the Quick Edit module.
 */

/**
 * Implements hook_quickedit_editor_info().
 *
 * @see Drupal 8's \Drupal\quickedit\Plugin\InPlaceEditorManager.
 * @see Drupal 8's \Drupal\quickedit\Plugin\InPlaceEditorInterface.
 */
function quickedit_quickedit_editor_info() {
  $editors = array();
  $path = backdrop_get_path('module', 'quickedit') . '/InPlaceEditors';
  $editors['form'] = array(
    'file' => $path . '/formEditor.php',
    'class' => 'FormEditor',
  );
  $editors['plain_text'] = array(
    'file' => $path . '/plainTextEditor.php',
    'class' => 'PlainTextEditor',
  );
  // InPlaceEditors/CKEditor.php is still unported Drupal 7 CKEditor 4 code
  // (calls ckeditor_get_profile(), which doesn't exist here, among other
  // things) and fatals the moment it's instantiated. module_exists('ckeditor')
  // can genuinely be TRUE on a real Backdrop site: Backdrop officially
  // supports running the legacy CKEditor 4 module (backdrop-contrib/ckeditor,
  // in core until 1.27.0) alongside CKEditor 5 during a transition period, so
  // this isn't a hypothetical case to gate against, it happens. Not
  // registering an in-place editor for it at all, rather than registering a
  // broken one, so formatted text fields correctly fall back to the 'form'
  // editor instead of fataling. Replacing this with a real, generic
  // FormattedText in-place editor (targeting CKEditor 5's DecoupledEditor,
  // per the architecture worked out earlier) is Milestone 2 work, not
  // reintroducing D7's CKEditor 4-specific integration.
  return $editors;
}
