import { prompts } from "./prompts";

export class SongSearchApp {
    running = false;
    analyze_prompt_button = document.body.querySelector(".analyze_prompt_button") as HTMLButtonElement;
    analyze_prompt_textarea = document.body.querySelector(".analyze_prompt_textarea") as HTMLTextAreaElement;
    embedding_diagram_anchor: any = document.body.querySelector(".embedding_diagram_anchor");
    full_augmented_response = document.body.querySelector(".full_augmented_response") as HTMLDivElement;
    metric_filter_select = document.body.querySelector(".metric_filter_select") as HTMLSelectElement;
    filter_container = document.body.querySelector(".filter_container") as HTMLDivElement;
    audio_visualizer = document.body.querySelector(".audio_visualizer") as HTMLDivElement;
    song_playlist = document.body.querySelector(".song_playlist") as HTMLOListElement;
    audio_player = document.body.querySelector(".audio_player") as HTMLAudioElement;
    play_song_search = document.body.querySelector(".play_song_search") as HTMLButtonElement;
    play_song_playlist = document.body.querySelector(".play_song_playlist") as HTMLButtonElement;
    add_song = document.body.querySelector(".add_song") as HTMLButtonElement;
    play_next = document.body.querySelector(".play_next") as HTMLButtonElement;
    chunk_select = document.body.querySelector(".chunk_select") as HTMLSelectElement;
    song_title_container = document.body.querySelector(".song_title_container") as HTMLDivElement;
    show_search_overlay = document.body.querySelector(".show_search_overlay") as HTMLButtonElement;
    intro_modal_close = document.body.querySelector(".intro_modal_close") as HTMLButtonElement;
    ui_container = document.body.querySelector(".ui_container") as HTMLDivElement;
    visualizerShowing = true;
    visualizerSettings: any = {
        source: this.audio_player,
        bgColor: "#ffffff",
        bgAlpha: 0,
        radial: true,
        ledBars: true,
        showScaleX: false,
        showScaleY: false,
        linearBoost: 3,
        minFreq: 1000,
        maxFreq: 8000,
        barSpace: 0,
        radius: 0,
        spinSpeed: 1.5,
        frequencyScale: "log",
        channelLayout: "dual-horizontal",
        mode: 10,
        gradientLeft: "prism",
        gradientRight: "classic",
        maxDecibels: -25,
        minDecibels: -90,
    };
    songsInPlaylist: any[] = [];
    motionVisualizer: any = null;
    lookupData: any = {};
    songMatchLookup: any = {};
    lookedUpIds: any = {};
    semanticResults: any[] = [];
    selectedFilters: any[] = [];
    playlistIndex = -1;
    songChunkMeta = {
        apiToken: "cfbde57f-a4e6-4eb9-aea4-36d5fbbdad16",
        sessionId: "8umxl4rdt32x",
        lookupPath: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/projectLookups%2FHlm0AZ9mUCeWrMF6hI7SueVPbrq1%2Fsong-demo-v3%2FbyDocument%2FDOC_ID_URIENCODED.json?alt=media",
        topK: 25,
    }
    stanzaChunkMeta = {
        apiToken: "b0a5f137-b5ff-4b78-8074-79a3f775a212",
        sessionId: "prg66uadseer",
        lookupPath: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/projectLookups%2FHlm0AZ9mUCeWrMF6hI7SueVPbrq1%2Fsong-demo-v6-4-1%2FbyDocument%2FDOC_ID_URIENCODED.json?alt=media",
        topK: 25,
    }
    verseChunkMeta = {
        apiToken: "6b71e856-1dee-4f9d-bd53-64b6adafc592",
        sessionId: "bsec9cwrpl72",
        lookupPath: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/projectLookups%2FHlm0AZ9mUCeWrMF6hI7SueVPbrq1%2Fsong-demo-v6-verse%2FbyDocument%2FDOC_ID_URIENCODED.json?alt=media",
        topK: 50,
    }
    metricPrompts: any[] = [];
    promptUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/message`;
    queryUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/vectorquery`;
    loaded = false;
    lookUpKeys: string[] = [];
    verboseDebugging = false;
    runningQuery = false;

    constructor() {
        this.analyze_prompt_button.addEventListener("click", async () => {
            await this.lookupAIDocumentChunks();
        });
        this.analyze_prompt_textarea.addEventListener("keydown", (e: any) => {
            if (e.key === "Enter" && e.shiftKey === false) {
                e.preventDefault();
                e.stopPropagation();
                this.analyze_prompt_button.click();
            }
        });
        this.analyze_prompt_textarea.addEventListener("input", () => {
            localStorage.setItem("song_lastPrompt", this.analyze_prompt_textarea.value);
        });
        this.play_next.addEventListener("click", () => this.playNext());
        this.metric_filter_select.addEventListener("input", () => this.addMetricFilter());
        this.audio_player.addEventListener("ended", () => {
            this.playNext();
        });
        this.motionVisualizer = new (<any>window).AudioMotionAnalyzer(this.audio_visualizer, this.visualizerSettings);

        this.resizeVisualizer();

        this.chunk_select.addEventListener("input", () => {
            this.saveFiltersToLocalStorage();
            this.load();
        });
        this.song_title_container.addEventListener("click", () => {
            this.showOverlay("playlist", true);
        });
        this.show_search_overlay.addEventListener("click", () => {
            const searchModalDom = document.getElementById('search_modal') as HTMLElement;
            const searchModal = new (window as any).bootstrap.Modal(searchModalDom);
            searchModal.show();
            this.visualizerShowing = false;
            searchModalDom.addEventListener('hidden.bs.modal', (e: Event) => {
                this.visualizerShowing = true;
              });
        });
        this.intro_modal_close.addEventListener("click", () => {
            this.load();
        });

        window.addEventListener("resize", () => {
            this.resizeVisualizer();
        });

        window.addEventListener("keydown", (e: any) => {
            if (this.visualizerShowing === false) return;
            if (e.key === "ArrowRight") {
                this.playNext();
            }
            if (e.key === "ArrowLeft") {
                this.playNext(this.playlistIndex - 2);
            }
            if (e.key === "ArrowDown") {
                this.audio_player.currentTime -= 5;
            }
            if (e.key === "ArrowUp") {
                this.audio_player.currentTime += 5;
            }
            if (e.key === " ") {
                if (this.audio_player.paused) this.audio_player.play();
                else this.audio_player.pause();
            }
        });

        window.document.addEventListener("click", (e: Event) => {
            if (e.target !== window.document.body &&
                e.target !== this.ui_container) return;
            if (this.visualizerShowing === false) return;
            if (this.audio_player.paused) this.audio_player.play();
            else this.audio_player.pause();
        });

        const introModal = new (window as any).bootstrap.Modal(document.getElementById('hello_modal'));
        introModal.show();
    }
    showOverlay(overlayName: string = "none", toggle = false) {
        const overlays = ["none", "playlist", "search", "lyrics", "about"];
        overlays.forEach((overlay: string) => {
            if (overlay === overlayName) {
                if (document.body.classList.contains(overlay) === false) {
                    document.body.classList.add(overlay);
                } else if (toggle === true) {
                    document.body.classList.remove(overlay);
                }
            } else {
                document.body.classList.remove(overlay);
            }
        });
    }
    addMetricFilter() {
        const metaField = this.metric_filter_select.value;
        this.selectedFilters.push({ metaField, value: 1, operator: "$gte" });
        this.renderFilters();
        this.saveFiltersToLocalStorage();
        this.metric_filter_select.selectedIndex = 0;
    }
    resizeVisualizer(reason: string = "") {
        let canvasWidth = this.motionVisualizer.canvas.width;
        let canvasHeight = this.motionVisualizer.canvas.height;

        if (this.motionVisualizer.isFullscreen) {
            document.body.classList.add("fullscreen");
        } else {
            document.body.classList.remove("fullscreen");
        }
        if (canvasHeight > canvasWidth) {
            const scale = canvasHeight / canvasWidth;
            if (this.motionVisualizer.isFullscreen) {
                const offset = (canvasHeight * scale - canvasHeight) / 2;
                this.motionVisualizer.canvasCtx.translate(0, -offset);
                this.motionVisualizer.canvasCtx.scale(1, scale);
            } else {
                this.motionVisualizer.canvas.style.transform = `scaleY(${scale})`;
            }
        } else {
            const scale = canvasWidth / canvasHeight;
            if (this.motionVisualizer.isFullscreen) {
                const offset = (canvasWidth * scale - canvasWidth) / 2;
                this.motionVisualizer.canvasCtx.translate(-offset, 0);
                this.motionVisualizer.canvasCtx.scale(scale, 1);
            } else {
                this.motionVisualizer.canvas.style.transform = `scaleX(${scale})`;
            }
        }
    }
    renderFilters() {
        this.filter_container.innerHTML = "";
        this.selectedFilters.forEach((filter: any, filterIndex: number) => {
            let filterDiv = document.createElement("div");
            filterDiv.innerHTML = this.selectedFilterTemplate(filter, filterIndex);
            this.filter_container.appendChild(filterDiv);
        });
        this.filter_container.querySelectorAll("button").forEach((button: HTMLButtonElement) => {
            button.addEventListener("click", () => {
                let filterIndex = Number(button.getAttribute("data-filterindex"));
                this.selectedFilters.splice(filterIndex, 1);
                this.renderFilters();
                this.saveFiltersToLocalStorage();
            });
        });
        this.filter_container.querySelectorAll(".filter-select select").forEach((select: Element) => {
            select.addEventListener("input", () => {
                let filterIndex = Number(select.getAttribute("data-filterindex"));
                this.selectedFilters[filterIndex].operator = (select as any).value;
                this.saveFiltersToLocalStorage();
            });
        });
        this.filter_container.querySelectorAll(".filter-value select").forEach((select: Element) => {
            select.addEventListener("input", () => {
                let filterIndex = Number(select.getAttribute("data-filterindex"));
                this.selectedFilters[filterIndex].value = (select as any).value;
                this.saveFiltersToLocalStorage();
            });
        });

        let html = "<option>Choose a metric</option>";
        this.metricPrompts.forEach((prompt: any) => {
            let promptUsed = false;
            this.selectedFilters.forEach((filter: any) => {
                if (filter.metaField === prompt.id) promptUsed = true;
            });

            if (promptUsed === false) html += `<option>${prompt.id}</option>`;
        });
        this.metric_filter_select.innerHTML = html;
    }
    async getMatchingVectors(message: string, topK: number, apiToken: string, sessionId: string): Promise<any> {
        const filter: any = {};
        this.selectedFilters.forEach((selectedFilter: any) => {
            filter[selectedFilter.metaField] = { [selectedFilter.operator]: Number(selectedFilter.value) };
        });

        const body = {
            message,
            apiToken,
            sessionId,
            topK,
            filter,
        };
        const fetchResults = await fetch(this.queryUrl, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        return await fetchResults.json();
    }
    saveFiltersToLocalStorage() {
        localStorage.setItem("song_filters", JSON.stringify(this.selectedFilters));
    }
    savePlaylistToLocalStorage() {
        const songExport = this.songsInPlaylist.map((song: string) => this.songMatchLookup[song]);
        localStorage.setItem("song_playlist", JSON.stringify(songExport));
    }
    loadPlaylistFromLocalStorage() {
        const playlistRaw = localStorage.getItem("song_playlist");
        let playlistMap: any = [];
        if (playlistRaw) playlistMap = JSON.parse(playlistRaw);
        this.songsInPlaylist = playlistMap.map((songData: any) => songData.id);
        this.songMatchLookup = {};
        playlistMap.forEach((song: any) => {
            this.songMatchLookup[song.id] = song;
        });
        this.renderPlaylist();
    }
    load() {
        this.metricPrompts = prompts;
        this.loaded = true;
        this.lookupData = {};
        this.lookedUpIds = {};
        this.hydrateFromLocalStorage();
    }
    getChunkSizeMeta(): any {
        const chunkSize = this.chunk_select.value;
        if (chunkSize === "verse") return this.verseChunkMeta;
        if (chunkSize === "stanza") return this.stanzaChunkMeta;
        return this.songChunkMeta;
    }
    async lookupAIDocumentChunks() {
        if (this.runningQuery === true) return;
        this.full_augmented_response.innerHTML = "Search running...";
        this.runningQuery = true;
        const message = this.analyze_prompt_textarea.value.trim();
        const chunkSizeMeta = this.getChunkSizeMeta();
        let result = await this.getMatchingVectors(message, chunkSizeMeta.topK, chunkSizeMeta.apiToken, chunkSizeMeta.sessionId);
        if (result.success === false) {
            console.log("FAILED TO FETCH", result);
            this.full_augmented_response.innerHTML = "Error fetching results. Please refer to console for details.";
            this.runningQuery = false;
            return;
        }

        let html = "";
        await this.fetchDocumentsLookup(result.matches.map((match: any) => match.id));
        result.matches.forEach((match: any) => {
            const textFrag = this.lookupData[match.id];
            this.songMatchLookup[match.id] = match;
            if (!textFrag) {
                console.log(match.id, this.lookupData)
            }
            const parts = match.id.split("_");
            const docID = parts[0];
            const chunkIndex = Number(parts[2]);
            const chunkCount = parts[3];
            const generateSongCard = (match: any, textFrag: string) => {
                const categories = ['romantic', 'comedic', 'inappropriatelanguage', 'mature', 'seasonal', 'motivational', 'political', 'religious', 'sad', 'violent'];
                let catString = "";
                categories.forEach(category => {
                    if (match.metadata[category] !== 0) {
                        catString += `
                      <span class="badge bg-primary me-1">${category}: ${match.metadata[category]}</span>`;
                    }
                });
                return `
                  <div class="card mb-4 shadow">
                    <div class="card-body">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">${match.metadata.artist} - ${match.metadata.title}</h5>
                        <span class="badge bg-success">Match: <b>${(match.score * 100).toFixed()}%</b></span>
                      </div>
                      <div class="mb-3">${catString}</div>
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <button class="btn btn-primary play_song me-2" data-song="${match.id}">
                            <i class="material-icons">play_arrow</i> Play
                          </button>
                          <button class="btn btn-secondary add_song" data-song="${match.id}">
                            <i class="material-icons">add</i> Add
                          </button>
                        </div>
                      </div>
                      <div class="song_card_text" style="white-space:pre-wrap">${textFrag}</div>
                    </div>
                  </div>`;
            }
            let block = generateSongCard(match, textFrag);
            html += block;
        });

        this.full_augmented_response.innerHTML = html;
        let addButtons = this.full_augmented_response.querySelectorAll(".add_song");
        addButtons.forEach((button: any) => {
            button.addEventListener("click", () => {
                let songId = button.getAttribute("data-song");
                this.addSongToPlaylist(songId);
            });
        });
        let playButtons = this.full_augmented_response.querySelectorAll(".play_song");


        this.runningQuery = false;
        return;
    }
    addPlayNow(song: string) {
        if (this.songsInPlaylist.includes(song) === false) this.songsInPlaylist.unshift(song);
        this.playlistIndex = this.songsInPlaylist.indexOf(song);
        this.audio_player.src = this.songMatchLookup[song].metadata.url;
        this.audio_player.play();
        this.renderPlaylist();
        this.savePlaylistToLocalStorage();
    }
    addSongToPlaylist(song: string) {
        this.songsInPlaylist.push(song);
        this.renderPlaylist();
        this.savePlaylistToLocalStorage();
    }
    removeSongFromPlaylist(songIndex: string) {
        let songIndexNum = Number(songIndex);
        this.songsInPlaylist.splice(songIndexNum, 1);
        if (this.playlistIndex === songIndexNum) {
            this.playlistIndex--;
            if (this.playlistIndex < 0) this.playlistIndex = 0;
            this.playNext(this.playlistIndex);
        }
        if (this.playlistIndex > songIndexNum) this.playlistIndex--;
        this.renderPlaylist();
        this.savePlaylistToLocalStorage();
    }
    renderPlaylist() {
        this.song_playlist.innerHTML = "";
        this.songsInPlaylist.forEach((song: string, songIndex: number) => {
            const data = this.songMatchLookup[song];
            let li = document.createElement("li");
            li.classList.add("song_playlist_item");
            li.classList.add("list-group-item");
            if (this.playlistIndex === songIndex) li.classList.add("selected");
            li.innerHTML = `<div style="display:flex; flex-direction:row;color:#fff"><div style="flex:1;">${data.metadata.title}</div>
            <button class="btn playlist_buttons play_song_playlist" data-songindex="${songIndex}"><i class="material-icons">play_arrow</i></button>
            <button class="btn playlist_buttons remove_song" data-songindex="${songIndex}"><i class="material-icons">delete</i></button>
            <div>`;
            this.song_playlist.appendChild(li);
        });
        let remove_buttons = this.song_playlist.querySelectorAll(".remove_song");
        remove_buttons.forEach((button: any) => {
            button.addEventListener("click", () => {
                this.removeSongFromPlaylist(button.getAttribute("data-songindex"));
            });
        });
        let play_buttons = this.song_playlist.querySelectorAll(".play_song_playlist");
        play_buttons.forEach((button: any) => {
            button.addEventListener("click", () => {
                this.playNext(Number(button.getAttribute("data-songindex")));
            });
        });
    }
    async fetchDocumentsLookup(idList: string[]) {
        const promises: any[] = [];
        const docIdMap: any = {};
        idList.forEach((chunkId: string) => {
            const parts = chunkId.split("_");
            let docId = parts[0];
            if (this.lookedUpIds[docId] !== true)
                docIdMap[docId] = true;
        });
        Object.keys(docIdMap).forEach((id: string) => promises.push(this.loadDocumentLookup(id)));
        let chunkMaps = await Promise.all(promises);
        chunkMaps.forEach((chunkMap: any) => {
            Object.keys(chunkMap).forEach((chunkId: string) => {
                this.lookupData[chunkId] = chunkMap[chunkId];
            });
        });
        Object.assign(this.lookedUpIds, docIdMap);
        this.lookUpKeys = Object.keys(this.lookupData).sort();
    }
    async loadDocumentLookup(docId: string): Promise<any> {
        try {
            let lookupPath = this.getChunkSizeMeta().lookupPath;
            lookupPath = lookupPath.replace("DOC_ID_URIENCODED", docId);
            console.log(lookupPath);
            const r = await fetch(lookupPath);
            const result = await r.json();
            return result;
        } catch (error: any) {
            console.log("FAILED TO FETCH CHUNK MAP", docId, error);
            return {};
        }
    }
    escapeHTML(str: string): string {
        if (!str) str = "";
        return str.replace(/[&<>'"]/g,
            (match) => {
                switch (match) {
                    case "&": return "&amp;";
                    case "<": return "&lt;";
                    case ">": return "&gt;";
                    case "'": return "&#39;";
                    case "\"": return "&quot;";
                }

                return match;
            });
    }
    hydrateFromLocalStorage() {
        const lastPrompt = localStorage.getItem("song_lastPrompt");
        if (lastPrompt) this.analyze_prompt_textarea.value = lastPrompt;
        this.analyze_prompt_textarea.setSelectionRange(0, this.analyze_prompt_textarea.value.length);
        const filters = localStorage.getItem("song_filters");
        if (filters) this.selectedFilters = JSON.parse(filters);
        const songFilterSize = localStorage.getItem("song_filterSize");
        if (songFilterSize) this.chunk_select.value = songFilterSize;
        if (this.chunk_select.selectedIndex === -1) this.chunk_select.selectedIndex = 0;
        this.renderFilters();
        this.loadPlaylistFromLocalStorage();
        this.renderPlaylist();
        this.playNext();
    }
    playNext(songIndex: number = -1) {
        if (this.songsInPlaylist.length === 0) return;
        if (songIndex !== -1)
            this.playlistIndex = songIndex
        else
            this.playlistIndex++;
        this.playlistIndex = this.playlistIndex % this.songsInPlaylist.length;
        const songId = this.songsInPlaylist[this.playlistIndex];
        const songData = this.songMatchLookup[songId];
        this.audio_player.src = songData.metadata.url;
        try {
            this.audio_player.play();
        } catch (error: any) {
            console.log("FAILED TO PLAY", error);
        }
        this.renderPlaylist();
        this.song_title_container.innerHTML = `${songData.metadata.title} - ${songData.metadata.artist} <i class="material-icons">expand_more</i>`;
    }
    selectedFilterTemplate(filter: any, filterIndex: number): string {
        const title = filter.metaField;
        const lessThan = filter.operator === "$lte" ? "selected" : "";
        const greaterThan = filter.operator === "$gte" ? "selected" : "";
        return `<div class="filter_modal">
        <div class="filter-element">
          <div class="filter-header">
            <span class="metric-filter-title">${title}</span>
          </div>
          <div class="filter-body">
            <div class="filter-select">
              <select class="form-select" data-filterindex="${filterIndex}">
                <option value="$lte" ${lessThan}>&#8804;</option>
                <option value="$gte" ${greaterThan}>&#8805;</option>
              </select>
            </div>
            <div class="filter-value">
              <select class="form-select" data-filterindex="${filterIndex}">
                ${Array.from({ length: 11 }, (_, i) => `<option value="${i}" ${filter.value === i ? 'selected' : ''}>${i}</option>`).join('')}
              </select>
            </div>
          </div>
          <button class="delete-button" data-filterindex="${filterIndex}">
              <i class="material-icons">delete</i>
            </button>
        </div>
      </div>`
    }
    titleCase(title: string): string {
        return title[0].toUpperCase() + title.slice(1).toLowerCase();
    }
}
