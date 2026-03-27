/**
 * Utilitário para validação, otimização e recomendações de imagens
 * Garante que imagens tenham tamanho apropriado e sejam exibidas corretamente
 */

export interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

export interface ImageRecommendation {
    context: string;
    recommendedWidth: number;
    recommendedHeight: number;
    recommendedAspectRatio: string;
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
    message: string;
}

export interface ImageValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
    dimensions?: ImageDimensions;
    recommendation?: ImageRecommendation;
}

// Contextos de imagem com recomendações específicas
const imageRecommendations: Record<string, ImageRecommendation> = {
    CAROUSEL: {
        context: "Carrossel",
        recommendedWidth: 1200,
        recommendedHeight: 600,
        recommendedAspectRatio: "2:1 (16:9 é aceitável)",
        minWidth: 800,
        minHeight: 400,
        maxWidth: 2400,
        maxHeight: 1200,
        message: "Para melhor exibição em telas de desktop e mobile, use 1200x600 (2:1)",
    },
    CAROUSEL_EVENT: {
        context: "Foto de Evento",
        recommendedWidth: 400,
        recommendedHeight: 400,
        recommendedAspectRatio: "1:1 (quadrado)",
        minWidth: 300,
        minHeight: 300,
        maxWidth: 800,
        maxHeight: 800,
        message: "Use uma imagem quadrada (400x400) para foto de perfil de evento",
    },
    COMUNICADO: {
        context: "Imagem de Comunicado",
        recommendedWidth: 800,
        recommendedHeight: 600,
        recommendedAspectRatio: "4:3",
        minWidth: 600,
        minHeight: 400,
        maxWidth: 1600,
        maxHeight: 1200,
        message: "Para comunicados, recomenda-se 800x600 (4:3)",
    },
    THUMBNAIL: {
        context: "Thumbnail/Miniatura",
        recommendedWidth: 300,
        recommendedHeight: 300,
        recommendedAspectRatio: "1:1 (quadrado)",
        minWidth: 200,
        minHeight: 200,
        maxWidth: 600,
        maxHeight: 600,
        message: "Use uma imagem quadrada (300x300) para thumbnails",
    },
    HERO: {
        context: "Imagem Hero (Full Width)",
        recommendedWidth: 1920,
        recommendedHeight: 600,
        recommendedAspectRatio: "16:9 ou 3:1",
        minWidth: 1200,
        minHeight: 400,
        maxWidth: 4000,
        maxHeight: 1200,
        message: "Para imagens em tela cheia, use 1920x600 mínimo (16:9)",
    },
};

/**
 * Obtém as dimensões de uma imagem
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    aspectRatio: img.naturalWidth / img.naturalHeight,
                });
            };
            img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsDataURL(file);
    });
}

/**
 * Valida uma imagem e retorna recomendações
 */
export async function validateImage(
    file: File,
    context: keyof typeof imageRecommendations,
    maxFileSize: number = 5 * 1024 * 1024 // 5MB padrão
): Promise<ImageValidationResult> {
    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
        return {
            isValid: false,
            error: "Arquivo não é uma imagem válida. Use PNG, JPG ou WEBP.",
        };
    }

    // Validar tamanho de arquivo
    if (file.size > maxFileSize) {
        const sizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
        return {
            isValid: false,
            error: `Arquivo muito grande. Máximo: ${sizeMB}MB. Seu arquivo: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        };
    }

    // Validar formato
    const validFormats = ["image/png", "image/jpeg", "image/webp"];
    if (!validFormats.includes(file.type)) {
        return {
            isValid: false,
            error: "Formato não suportado. Use PNG, JPG ou WEBP.",
        };
    }

    try {
        const dimensions = await getImageDimensions(file);
        const recommendation = imageRecommendations[context];

        if (!recommendation) {
            return {
                isValid: true,
                dimensions,
            };
        }

        // Verificar se está dentro dos limites mínimos
        if (dimensions.width < recommendation.minWidth || dimensions.height < recommendation.minHeight) {
            return {
                isValid: false,
                error: `Imagem muito pequena. Mínimo: ${recommendation.minWidth}x${recommendation.minHeight}. Sua imagem: ${dimensions.width}x${dimensions.height}`,
                dimensions,
                recommendation,
            };
        }

        // Verificar se está dentro dos limites máximos
        if (dimensions.width > recommendation.maxWidth || dimensions.height > recommendation.maxHeight) {
            return {
                isValid: false,
                error: `Imagem muito grande. Máximo: ${recommendation.maxWidth}x${recommendation.maxHeight}. Sua imagem: ${dimensions.width}x${dimensions.height}`,
                dimensions,
                recommendation,
            };
        }

        // Validar aspect ratio (com tolerância de 10%)
        const recommendedAspectRatios = extractAspectRatios(recommendation.recommendedAspectRatio);
        const isAspectRatioOk = recommendedAspectRatios.some(
            (ratio) => Math.abs(dimensions.aspectRatio - ratio) / ratio < 0.15
        );

        if (!isAspectRatioOk) {
            const deviation = recommendedAspectRatios.map((r) => `${r.toFixed(2)}`).join(" ou ");
            return {
                isValid: true,
                warning: `Proporção não ideal. Recomendado: ${recommendation.recommendedAspectRatio} (${deviation}). Sua imagem: ${dimensions.aspectRatio.toFixed(2)}`,
                dimensions,
                recommendation,
            };
        }

        return {
            isValid: true,
            dimensions,
            recommendation,
        };
    } catch (error: any) {
        return {
            isValid: false,
            error: error.message || "Erro ao validar imagem",
        };
    }
}

/**
 * Extrai aspect ratios da string de recomendação
 */
function extractAspectRatios(ratioString: string): number[] {
    const ratios: number[] = [];

    // Extrai padrões como "2:1", "16:9", "1:1"
    const matches = ratioString.match(/(\d+):(\d+)/g);
    if (matches) {
        matches.forEach((match) => {
            const [w, h] = match.split(":").map(Number);
            ratios.push(w / h);
        });
    }

    return ratios.length > 0 ? ratios : [1];
}

/**
 * Retorna a recomendação para um contexto
 */
export function getRecommendation(context: keyof typeof imageRecommendations): ImageRecommendation | null {
    return imageRecommendations[context] || null;
}

/**
 * Obtém lista de todos os contextos disponíveis
 */
export function getAvailableContexts(): Array<[string, string]> {
    return Object.entries(imageRecommendations).map(([key, value]) => [key, value.context]);
}

/**
 * Converte dimensões para porcentagem de correspondência com recomendação
 */
export function calculateRecommendationMatch(
    dimensions: ImageDimensions,
    recommendation: ImageRecommendation
): number {
    const widthMatch = (dimensions.width / recommendation.recommendedWidth) * 100;
    const heightMatch = (dimensions.height / recommendation.recommendedHeight) * 100;

    // Retorna a menor correspondência (limitado entre 50 e 100%)
    const match = Math.min(widthMatch, heightMatch);
    return Math.max(50, Math.min(100, match));
}

/**
 * Formata as dimensões para exibição
 */
export function formatDimensions(width: number, height: number): string {
    return `${width}x${height}px`;
}

/**
 * Calcula o tamanho do arquivo em MB
 */
export function formatFileSize(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(2);
}

/**
 * Gera mensagem de recomendação amigável
 */
export function getRecommendationMessage(result: ImageValidationResult): string {
    if (!result.isValid && result.error) {
        return `❌ ${result.error}`;
    }

    if (result.warning) {
        return `⚠️ ${result.warning}`;
    }

    if (result.recommendation && result.dimensions) {
        return `✅ ${result.recommendation.message}`;
    }

    return "✅ Imagem válida";
}
