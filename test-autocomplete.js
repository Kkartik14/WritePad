/**
 * Test script for WritePad autocomplete functionality
 * Run this in the browser console when the editor is loaded
 */

(function() {
  console.clear();
  console.log('🔍 AUTOCOMPLETE TEST SCRIPT');
  console.log('==========================');
  
  // Find the editor instance
  const findEditor = () => {
    // This is a common pattern with TipTap
    return window.editor || document.querySelector('.ProseMirror')?.editor;
  };
  
  const editor = findEditor();
  if (!editor) {
    console.error('❌ Could not find editor instance. Make sure you run this when the editor is loaded.');
    return;
  }
  
  console.log('✅ Found editor instance:', editor);
  
  // Check initial autocomplete state
  const checkAutocompleteState = () => {
    const storage = editor.storage?.autocomplete;
    console.log('📊 Current autocomplete storage:', storage);
    
    const extension = editor.extensionManager?.extensions?.find(e => e.name === 'autocomplete');
    console.log('📊 Autocomplete extension:', extension);
    
    if (extension) {
      console.log('📊 Extension options:', extension.options);
    }
    
    if (storage) {
      console.log('📊 Enabled state in storage:', storage.enabled);
      return storage.enabled;
    }
    
    return null;
  };
  
  // Toggle the autocomplete feature
  const toggleAutocomplete = () => {
    // Find the toggle button in the toolbar
    const toggleButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.innerText.includes('Autocomplete') || 
           btn.title?.includes('Autocomplete') ||
           btn.innerHTML.includes('Wand'));
    
    if (!toggleButton) {
      console.error('❌ Could not find autocomplete toggle button.');
      return;
    }
    
    console.log('🔘 Found toggle button:', toggleButton);
    console.log('🔄 Current state before toggle:', checkAutocompleteState());
    
    // Click the button to toggle
    console.log('👆 Clicking toggle button...');
    toggleButton.click();
    
    // Check state after toggle
    setTimeout(() => {
      console.log('🔄 State after toggle:', checkAutocompleteState());
      
      // Force an update - just to be extra sure
      document.dispatchEvent(new CustomEvent('force-editor-update'));
      
      // Type some text to test
      if (editor.storage.autocomplete?.enabled) {
        console.log('✍️ Testing typing with autocomplete ON...');
        editor.commands.focus();
        editor.commands.clearContent();
        editor.commands.insertContent('I am ');
        
        // This should trigger a completion request
        console.log('⏳ Waiting for suggestions...');
      }
    }, 500);
  };
  
  // Run the test
  console.log('🚀 Starting autocomplete test...');
  checkAutocompleteState();
  toggleAutocomplete();
  
  // Export utilities to window for manual testing
  window.autocompleteTest = {
    checkState: checkAutocompleteState,
    toggle: toggleAutocomplete
  };
  
  console.log('📝 Test utilities available at window.autocompleteTest');
  console.log('  - Check state: window.autocompleteTest.checkState()');
  console.log('  - Toggle feature: window.autocompleteTest.toggle()');
})(); 