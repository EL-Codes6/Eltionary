
        (function() {
            // ----- DOM elements -----
            const input = document.getElementById('wordInput');
            const searchBtn = document.getElementById('searchBtn');
            const card = document.getElementById('tiltCard');
            const contentDiv = document.getElementById('definitionContent');

            // ----- 3D tilt effect (mouse move) -----
            const container = document.querySelector('.dictionary-3d');
            const MAX_ROTATION = 8; // degrees

            function updateTilt(e) {
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const mouseX = e.clientX;
                const mouseY = e.clientY;

                let rotY = ((mouseX - centerX) / (rect.width / 2)) * MAX_ROTATION;
                let rotX = ((mouseY - centerY) / (rect.height / 2)) * -MAX_ROTATION;

                rotY = Math.min(MAX_ROTATION, Math.max(-MAX_ROTATION, rotY));
                rotX = Math.min(MAX_ROTATION, Math.max(-MAX_ROTATION, rotX));

                card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(30px)`;
            }

            function resetTilt() {
                card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(30px)`;
            }

            container.addEventListener('mousemove', updateTilt);
            container.addEventListener('mouseleave', resetTilt);

            // ----- dictionary API integration -----
            const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
            const FALLBACK_API_BASE = 'https://en.wiktionary.org/api/rest_v1/page/definition/';

            async function fetchFromWiktionary(word) {
                const response = await fetch(FALLBACK_API_BASE + encodeURIComponent(word));
                if (!response.ok) throw new Error(`Fallback API error: ${response.status}`);

                const data = await response.json();
                const definitions = data.en || [];
                if (!definitions.length) throw new Error(`No definition found for "${word}"`);

                const meanings = definitions.map(meaning => ({
                    partOfSpeech: meaning.partOfSpeech,
                    definitions: (meaning.definitions || []).map(definition => ({
                        definition: new DOMParser().parseFromString(definition.definition, 'text/html').body.textContent,
                        example: definition.examples?.[0]
                            ? new DOMParser().parseFromString(definition.examples[0], 'text/html').body.textContent
                            : ''
                    }))
                }));

                return { word, meanings };
            }

            async function fetchDefinition(word) {
                if (!word.trim()) return;
                contentDiv.innerHTML = `<div class="loading-placeholder">
                    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                    <span> looking up "${word}"...</span>
                </div>`;

                try {
                    const normalizedWord = word.trim().toLowerCase();
                    try {
                        const response = await fetch(API_BASE + encodeURIComponent(normalizedWord));
                        if (!response.ok) throw new Error(`API error: ${response.status}`);
                        const data = await response.json();
                        renderDefinition(data[0]);
                    } catch {
                        const entry = await fetchFromWiktionary(normalizedWord);
                        renderDefinition(entry);
                    }
                } catch (error) {
                    contentDiv.innerHTML = `<div class="error-message">😕 ${error.message}</div>`;
                }
            }

            function renderDefinition(entry) {
                if (!entry) {
                    contentDiv.innerHTML = `<div class="error-message">empty response</div>`;
                    return;
                }

                const word = entry.word || '?';
                const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
                const meanings = entry.meanings || [];

                let html = `
                    <div class="word-head">
                        <h2>${word}</h2>
                        ${phonetic ? `<span class="phonetic">${phonetic}</span>` : ''}
                    </div>
                `;

                meanings.forEach(meaning => {
                    const part = meaning.partOfSpeech || '?';
                    const definitions = meaning.definitions || [];
                    let defList = '<ul class="definitions">';
                    definitions.slice(0, 3).forEach(def => {
                        defList += `<li>
                            <div class="definition">• ${def.definition}</div>
                            ${def.example ? `<div class="example">${def.example}</div>` : ''}
                        </li>`;
                    });
                    if (definitions.length > 3) defList += '<li style="opacity:0.7;">⋯ more definitions available</li>';
                    defList += '</ul>';

                    html += `
                        <div class="meaning-block">
                            <div class="part-of-speech">${part}</div>
                            ${defList}
                        </div>
                    `;
                });

                if (meanings.length === 0) {
                    html += `<div class="error-message">no definitions found</div>`;
                }

                contentDiv.innerHTML = html;
            }

            // load default word on page start
            window.addEventListener('load', () => {
                fetchDefinition('cosmic');
            });

            // event listeners
            function handleSearch() {
                const word = input.value.trim();
                if (word) fetchDefinition(word);
            }

            searchBtn.addEventListener('click', handleSearch);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSearch();
            });
        })();
