require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/geometry/Point"
], function(Map, MapView, Graphic, Point) {
    const map = new Map({
        basemap: "satellite"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        zoom: 4,
        center: [-55, -10] // Centro aproximado do Brasil
    });

    view.when(() => {
        console.log("Mapa carregado com sucesso");
    });

    // Função para buscar localização
    function buscarLocalizacao() {
        const lat = parseFloat(document.getElementById("lat").value);
        const lon = parseFloat(document.getElementById("lon").value);

        if (isNaN(lat) || isNaN(lon)) {
            alert("Por favor, insira valores válidos para latitude e longitude.");
            return;
        }

        const point = new Point({
            longitude: lon,
            latitude: lat
        });

        view.graphics.removeAll();

        const graphic = new Graphic({
            geometry: point,
            symbol: {
                type: "simple-marker",
                color: [255, 0, 0],
                size: "12px"
            }
        });

        view.graphics.add(graphic);
        view.goTo({target: point, zoom: 15});

        document.getElementById("recognizeBtn").style.display = "block";
    }

    // Adicionar evento de clique ao botão de busca
    document.getElementById("searchBtn").addEventListener("click", buscarLocalizacao);

    async function reconhecerDeposito() {
        try {
            const screenshot = await view.takeScreenshot();
            const base64Image = screenshot.dataUrl.split(',')[1];
            const observacoes = await analisarImagemComOpenAI(base64Image);
            document.getElementById("description").innerHTML = observacoes;
        } catch (error) {
            console.error("Erro ao reconhecer depósito:", error);
            document.getElementById("description").innerHTML = "Ocorreu um erro ao tentar reconhecer o depósito. Por favor, tente novamente.";
        }
    }

    async function analisarImagemComOpenAI(base64Image) {
        const apiKey = config.OPENAI_API_KEY; // Use a chave do config.js
        try {
            console.log("Iniciando análise de imagem...");
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Analise esta imagem satelital de uma possível barragem de rejeitos. Foque na estabilidade física do depósito. Considere aspectos como:\n\n1. Geometria e inclinação dos taludes\n2. Sinais visíveis de erosão ou deslizamentos\n3. Presença e condição de sistemas de drenagem\n4. Vegetação nas encostas e sua relevância para a estabilidade\n5. Indícios de saturação do solo ou acúmulo excessivo de água\n6. Estruturas de contenção visíveis e sua aparente integridade\n7. Quaisquer outros elementos relevantes para a estabilidade física\n\nForneça uma análise detalhada desses aspectos, destacando potenciais riscos ou pontos de preocupação em relação à estabilidade do depósito." },
                                { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
                            ]
                        }
                    ],
                    max_tokens: 500
                })
            });
            console.log("Resposta recebida. Status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();
            console.log("Dados recebidos:", data);
            
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                throw new Error("Resposta inesperada da API");
            }
        } catch (error) {
            console.error("Erro detalhado ao analisar imagem:", error);
            throw error;
        }
    }

    document.getElementById("recognizeBtn").addEventListener("click", reconhecerDeposito);
});