/**
 * Component styles for NMRium Web Component
 * Import CSS as strings using ?inline to prevent auto-injection into document.head
 * These will be manually injected into shadow root only
 */

// CSS resets - must be loaded FIRST to provide baseline styles
import modernNormalize from 'modern-normalize/modern-normalize.css?inline';
import reactSciencePreflight from 'react-science/styles/preflight.css?inline';

// BlueprintJS component styles
import blueprintCSS from '@blueprintjs/core/lib/css/blueprint.css?inline';
import blueprintIconsCSS from '@blueprintjs/icons/lib/css/blueprint-icons.css?inline';
import blueprintSelectCSS from '@blueprintjs/select/lib/css/blueprint-select.css?inline';

// Direct path to bypass package.json exports restriction
import cheminfoFontCSS from '../../node_modules/cheminfo-font/dist/style.css?inline';

// Export individual CSS strings for injection into shadow root
// CSS will be organized in cascade layers for proper precedence hierarchy
export const componentStyles = {
  modernNormalize,
  reactSciencePreflight,
  blueprintCSS,
  blueprintIconsCSS,
  blueprintSelectCSS,
  cheminfoFontCSS,
};
