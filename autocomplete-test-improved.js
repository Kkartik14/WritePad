/**
 * Enhanced Test Script for WritePad Autocomplete v2.0
 * Run this in the browser console when the editor is loaded
 */

(function() {
  console.clear();
  console.log('🚀 ENHANCED AUTOCOMPLETE TEST SUITE v2.0');
  console.log('==========================================');
  
  // Test scenarios
  const testPhrases = [
    'I am ',
    'The project ',
    'We need to ',
    'Please ',
    'Thank you ',
    'I would like to ',
    'In order to ',
    'dev',
    'pro',
    'imp',
    'com'
  ];
  
  // Enhanced editor detection
  const findEditor = () => {
    const proseMirror = document.querySelector('.ProseMirror');
    if (proseMirror && window.editor) {
      return window.editor;
    }
    
    // Try to find from component state
    const editorContainer = document.querySelector('[data-testid="editor"]') || 
                           document.querySelector('.editor-container');
    if (editorContainer) {
      // React dev tools approach
      const reactKey = Object.keys(editorContainer).find(key => 
        key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')
      );
      if (reactKey) {
        let node = editorContainer[reactKey];
        while (node) {
          if (node.memoizedProps?.editor) {
            return node.memoizedProps.editor;
          }
          node = node.return;
        }
      }
    }
    
    return null;
  };
  
  const editor = findEditor();
  if (!editor) {
    console.error('❌ Could not find editor instance.');
    console.log('💡 Make sure WritePad is loaded and try again.');
    return;
  }
  
  console.log('✅ Found editor instance:', editor);
  
  // Check autocomplete state
  const checkAutocompleteState = () => {
    const storage = editor.storage?.autocomplete;
    const isEnabled = storage?.enabled ?? false;
    
    console.log('📊 Autocomplete State:');
    console.log('  - Enabled:', isEnabled);
    console.log('  - Storage:', storage);
    
    const extension = editor.extensionManager?.extensions?.find(e => e.name === 'autocomplete');
    if (extension) {
      console.log('  - Extension found with options:', extension.options);
    }
    
    return isEnabled;
  };
  
  // Toggle autocomplete
  const toggleAutocomplete = () => {
    const toggleButton = Array.from(document.querySelectorAll('button'))
      .find(btn => 
        btn.innerHTML.includes('Wand2') || 
        btn.title?.toLowerCase().includes('autocomplete') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('autocomplete')
      );
    
    if (!toggleButton) {
      console.error('❌ Could not find autocomplete toggle button.');
      console.log('💡 Look for a button with a wand icon in the toolbar.');
      return false;
    }
    
    console.log('🔘 Found toggle button, clicking...');
    toggleButton.click();
    
    return true;
  };
  
  // Enhanced test typing function
  const testTyping = async (phrase, delay = 100) => {
    console.log(`✍️ Testing phrase: "${phrase}"`);
    
    editor.commands.focus();
    editor.commands.clearContent();
    
    // Type character by character
    for (let i = 0; i < phrase.length; i++) {
      const partialText = phrase.substring(0, i + 1);
      editor.commands.insertContent(partialText);
      editor.commands.clearContent();
      editor.commands.insertContent(partialText);
      
      // Wait a bit to let autocomplete trigger
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Check if suggestion appeared
      const suggestion = document.querySelector('.autocomplete-suggestion');
      if (suggestion) {
        console.log(`  ✨ Suggestion appeared at "${partialText}": ${suggestion.textContent}`);
      }
    }
    
    // Final check
    setTimeout(() => {
      const finalSuggestion = document.querySelector('.autocomplete-suggestion');
      if (finalSuggestion) {
        console.log(`  🎯 Final suggestion: "${finalSuggestion.textContent}"`);
      } else {
        console.log(`  ❌ No final suggestion for "${phrase}"`);
      }
    }, 200);
  };
  
  // Run comprehensive test
  const runFullTest = async () => {
    console.log('🔬 Starting comprehensive autocomplete test...');
    
    const wasEnabled = checkAutocompleteState();
    
    if (!wasEnabled) {
      console.log('📝 Enabling autocomplete...');
      if (!toggleAutocomplete()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!checkAutocompleteState()) {
      console.error('❌ Failed to enable autocomplete.');
      return;
    }
    
    console.log('🧪 Running test phrases...');
    
    for (const phrase of testPhrases) {
      await testTyping(phrase, 150);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between tests
    }
    
    console.log('✅ Comprehensive test completed!');
    console.log('📋 Summary:');
    console.log('  - Test phrases:', testPhrases.length);
    console.log('  - Look for suggestions that appeared during typing');
    console.log('  - Check console for detailed results');
  };
  
  // Performance test
  const performanceTest = async () => {
    console.log('⚡ Running performance test...');
    
    const testText = 'The quick brown fox jumps over the lazy dog and ';
    const startTime = performance.now();
    
    editor.commands.focus();
    editor.commands.clearContent();
    editor.commands.insertContent(testText);
    
    // Measure response time
    const measureResponseTime = () => {
      return new Promise(resolve => {
        const observer = new MutationObserver(() => {
          const suggestion = document.querySelector('.autocomplete-suggestion');
          if (suggestion) {
            const endTime = performance.now();
            observer.disconnect();
            resolve(endTime - startTime);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        // Timeout after 3 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 3000);
      });
    };
    
    const responseTime = await measureResponseTime();
    
    if (responseTime) {
      console.log(`⚡ Autocomplete response time: ${responseTime.toFixed(2)}ms`);
    } else {
      console.log('⚠️ No autocomplete response within 3 seconds');
    }
  };
  
  // Event monitoring
  const monitorEvents = () => {
    console.log('👂 Setting up event monitoring...');
    
    const messageHandler = (event) => {
      const { message, type } = event.detail;
      console.log(`📢 Autocomplete ${type}: ${message}`);
    };
    
    const updateHandler = () => {
      console.log('🔄 Autocomplete UI update triggered');
    };
    
    document.addEventListener('autocomplete-message', messageHandler);
    document.addEventListener('autocomplete-update', updateHandler);
    
    // Cleanup function
    window.stopMonitoring = () => {
      document.removeEventListener('autocomplete-message', messageHandler);
      document.removeEventListener('autocomplete-update', updateHandler);
      console.log('🛑 Event monitoring stopped');
    };
    
    console.log('✅ Event monitoring active (call window.stopMonitoring() to stop)');
  };
  
  // Test Tab key acceptance specifically
  const testTabAcceptance = async (phrase = 'I am ') => {
    console.log(`🔗 Testing Tab key acceptance with phrase: "${phrase}"`);
    
    editor.commands.focus();
    editor.commands.clearContent();
    editor.commands.insertContent(phrase);
    
    // Wait for suggestion to appear
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const suggestion = document.querySelector('.autocomplete-suggestion');
    if (suggestion) {
      console.log(`✨ Suggestion found: "${suggestion.textContent}"`);
      
      // Test Tab key press
      console.log('🔨 Simulating Tab key press...');
      
      // Get the ProseMirror element
      const proseMirror = document.querySelector('.ProseMirror');
      if (proseMirror) {
        // Create and dispatch Tab key event
        const tabEvent = new KeyboardEvent('keydown', {
          key: 'Tab',
          code: 'Tab',
          bubbles: true,
          cancelable: true
        });
        
        proseMirror.dispatchEvent(tabEvent);
        
        // Check if suggestion was accepted
        setTimeout(() => {
          const stillHasSuggestion = document.querySelector('.autocomplete-suggestion');
          const editorContent = editor.getText();
          
          if (!stillHasSuggestion) {
            console.log('✅ Tab key worked! Suggestion was accepted.');
            console.log('📝 Editor content:', editorContent);
          } else {
            console.log('❌ Tab key did not work. Suggestion still visible.');
            console.log('📝 Editor content:', editorContent);
          }
        }, 100);
      } else {
        console.log('❌ Could not find ProseMirror element');
      }
    } else {
      console.log('❌ No suggestion found. Make sure autocomplete is enabled and working.');
    }
  };
  
  // Export test utilities
  window.autocompleteTestSuite = {
    checkState: checkAutocompleteState,
    toggle: toggleAutocomplete,
    testPhrase: testTyping,
    runFullTest,
    performanceTest,
    monitorEvents,
    testPhrases,
    testTabAcceptance
  };
  
  // Show available functions
  console.log('🛠️ Available test functions:');
  console.log('  - window.autocompleteTestSuite.checkState()     - Check current state');
  console.log('  - window.autocompleteTestSuite.toggle()         - Toggle autocomplete');
  console.log('  - window.autocompleteTestSuite.testPhrase(text) - Test specific phrase');
  console.log('  - window.autocompleteTestSuite.runFullTest()    - Run all tests');
  console.log('  - window.autocompleteTestSuite.performanceTest() - Measure performance');
  console.log('  - window.autocompleteTestSuite.monitorEvents()  - Monitor events');
  console.log('  - window.autocompleteTestSuite.testTabAcceptance(phrase) - Test Tab key acceptance');
  
  // Auto-start basic test
  console.log('🎬 Auto-starting basic functionality test...');
  checkAutocompleteState();
  
  if (checkAutocompleteState()) {
    console.log('✅ Autocomplete is already enabled, ready for testing!');
    console.log('💡 Try typing: window.autocompleteTestSuite.testPhrase("I am ")');
  } else {
    console.log('🔧 Autocomplete is disabled. Run window.autocompleteTestSuite.toggle() to enable.');
  }
  
})(); 