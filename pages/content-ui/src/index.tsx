export {};

// import { createRoot } from 'react-dom/client';
// const TAG = ' | content-ui/index.tsx | ';
// // Initial detection terms (can be fetched from an API in the future)
// let detectionTerms = {
//   email: [
//     { type: 'email' },
//     { autocomplete: 'username' },
//     { autocomplete: 'email' },
//     { placeholder: 'email' },
//     { name: 'loginfmt' }, // Example specific case
//     { id: 'username' }, // Detect any id containing 'username'
//   ],
//   password: [
//     { type: 'password' },
//     { autocomplete: 'current-password' },
//     { name: 'password' },
//     { id: 'password' }, // Detect any id containing 'password'
//     { class: 'text-neutral-content-strong' },
//   ],
// };
//
// // Function to check if an input matches any of the detection terms
// const matchesDetectionTerm = (input: any, terms: any) => {
//   return terms.some((term: any) => {
//     for (let key in term) {
//       if (input[key] && input[key].toLowerCase().includes(term[key])) {
//         console.log(`Matched ${key}: ${term[key]} with ${input[key]}`);
//         return true;
//       }
//     }
//     return false;
//   });
// };
//
// const openPopup = () => {
//   const tag = TAG + ' | openPopup | ';
//   try {
//     console.log(tag, 'Sending message to open popup');
//     chrome.runtime.sendMessage({ action: 'openPopup' }, response => {
//       console.log(tag, 'Response from background:', response);
//     });
//   } catch (e) {
//     console.error(tag, e);
//   }
// };
//
// const injectAutoCompleteButton = () => {
//   console.log('injectAutoCompleteButton called...');
//   let detected = false;
//
//   const forms = document.querySelectorAll('form');
//   console.log('Detected forms:', forms);
//
//   forms.forEach(form => {
//     form.querySelectorAll('input, select, textarea').forEach(input => {
//       console.log('Processing input: ', input);
//
//       // Use the detection terms to identify email and password fields
//       const isEmailField = matchesDetectionTerm(input, detectionTerms.email);
//       const isPasswordField = matchesDetectionTerm(input, detectionTerms.password);
//
//       if (isEmailField || isPasswordField) {
//         if (!detected) {
//           detected = true;
//           openPopup(); // Log event the first time a field is detected
//         }
//
//         console.log(`Detected ${isEmailField ? 'email' : 'password'} field: `, input);
//
//         // Check if the button is already inserted
//         if (input.parentNode.querySelector('.auto-fill-button')) {
//           console.log('Button already exists, skipping...');
//           return; // Skip if button already exists
//         }
//
//         const buttonContainer = document.createElement('div');
//         buttonContainer.style.position = 'relative';
//         buttonContainer.style.display = 'inline-block';
//         buttonContainer.style.marginLeft = '10px';
//         buttonContainer.style.zIndex = '10000'; // Ensures the button is on top of other elements
//
//         const button = document.createElement('button');
//         button.textContent = isEmailField ? 'Auto-fill email' : 'Auto-fill password';
//         button.type = 'button';
//         button.style.zIndex = '10000'; // Ensures the button is on top of other elements
//         button.style.backgroundColor = '#007bff'; // Style the button
//         button.style.color = 'white';
//         button.style.border = 'none';
//         button.style.padding = '5px 10px';
//         button.style.borderRadius = '4px';
//         button.style.cursor = 'pointer';
//         button.classList.add('auto-fill-button'); // Add a class to identify the button
//
//         const icon = document.createElement('img');
//         icon.src = 'https://pioneers.dev/coins/keepkey.png';
//         icon.alt = 'KeepKey Icon';
//         icon.style.width = '16px';
//         icon.style.height = '16px';
//         icon.style.marginRight = '5px';
//         button.prepend(icon);
//
//         button.addEventListener('click', () => {
//           openPopup();
//           input.value = isEmailField ? 'test@email.com' : '1234';
//           console.log(`Auto-fill button clicked for ${input.name || 'this field'}`);
//         });
//
//         input.parentNode?.insertBefore(buttonContainer, input.nextSibling);
//         buttonContainer.appendChild(button);
//         console.log('Button added for input:', input);
//       }
//     });
//   });
// };
//
// // Function to observe DOM changes and re-inject buttons if necessary
// const observeDOMChanges = () => {
//   const observer = new MutationObserver(mutations => {
//     mutations.forEach(mutation => {
//       if (mutation.addedNodes.length) {
//         injectAutoCompleteButton();
//       }
//     });
//   });
//
//   observer.observe(document.body, {
//     childList: true,
//     subtree: true,
//   });
//
//   console.log('MutationObserver started to watch DOM changes...');
// };
//
// // Initial injection and start observing
// injectAutoCompleteButton();
// observeDOMChanges();
//
// console.log('Initial injection and observer setup complete...');
