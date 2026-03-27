import React, { useState, useEffect } from "react";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import {
    validateImage,
    getRecommendation,
    getRecommendationMessage,
    formatDimensions,
    formatFileSize,
    calculateRecommendationMatch,
    type ImageValidationResult,
} from "../../utils/imageValidation";

export interface ImageUploadFieldProps {
    label?: string;
    context: "CAROUSEL" | "CAROUSEL_EVENT" | "COMUNICADO" | "THUMBNAIL" | "HERO";
    onFileSelect: (file: File | null) => void;
    selectedFile?: File | null;
    preview?: string | null;
    disabled?: boolean;
    maxFileSize?: number;
    showRecommendations?: boolean;
    className?: string;
}

export function ImageUploadField({
    label = "Imagem",
    context,
    onFileSelect,
    selectedFile,
    preview,
    disabled = false,
    maxFileSize = 5 * 1024 * 1024,
    showRecommendations = true,
    className = "",
}: ImageUploadFieldProps) {
    const [validation, setValidation] = useState<ImageValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const recommendation = getRecommendation(context);

    useEffect(() => {
        if (!selectedFile) {
            setValidation(null);
            return;
        }

        setIsValidating(true);
        validateImage(selectedFile, context, maxFileSize).then((result) => {
            setValidation(result);
            setIsValidating(false);
        });
    }, [selectedFile, context, maxFileSize]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onFileSelect(file);
    };

    const match = validation?.dimensions && recommendation ? calculateRecommendationMatch(validation.dimensions, recommendation) : null;

    return (
        <div className={`imageUploadField ${className}`}>
            {label && <label className="imageUploadField__label">{label}</label>}

            <div className="imageUploadField__container">
                {/* Recomendação */}
                {showRecommendations && recommendation && (
                    <div className="imageUploadField__recommendation">
                        <div className="imageUploadField__recHeader">
                            📐 <strong>Tamanho recomendado:</strong>
                        </div>
                        <div className="imageUploadField__recContent">
                            <div className="imageUploadField__recItem">
                                <span className="imageUploadField__recLabel">Ideal:</span>
                                <code>
                                    {recommendation.recommendedWidth}x{recommendation.recommendedHeight}px
                                </code>
                            </div>
                            <div className="imageUploadField__recItem">
                                <span className="imageUploadField__recLabel">Proporção:</span>
                                <code>{recommendation.recommendedAspectRatio}</code>
                            </div>
                            <div className="imageUploadField__recItem">
                                <span className="imageUploadField__recLabel">Tamanho mín-máx:</span>
                                <code>
                                    {recommendation.minWidth}x{recommendation.minHeight} até{" "}
                                    {recommendation.maxWidth}x{recommendation.maxHeight}
                                </code>
                            </div>
                        </div>
                    </div>
                )}

                {/* Área de upload */}
                {!preview && !selectedFile ? (
                    <label className={`imageUploadField__upload ${disabled ? "disabled" : ""}`}>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleFileChange}
                            disabled={disabled}
                            className="imageUploadField__input"
                        />
                        <div className="imageUploadField__uploadContent">
                            <Upload size={32} />
                            <div className="imageUploadField__uploadText">
                                <div className="imageUploadField__uploadMain">Selecionar imagem</div>
                                <div className="imageUploadField__uploadHint">PNG, JPG ou WEBP • Até {(maxFileSize / (1024 * 1024)).toFixed(0)}MB</div>
                            </div>
                        </div>
                    </label>
                ) : null}

                {/* Validação e Preview */}
                {selectedFile && validation && (
                    <div className={`imageUploadField__validation imageUploadField__validation--${validation.isValid ? "valid" : "invalid"}`}>
                        <div className="imageUploadField__validationHeader">
                            {validation.isValid ? <CheckCircle size={20} className="icon-valid" /> : <AlertCircle size={20} className="icon-invalid" />}
                            <div>
                                <div className="imageUploadField__validationTitle">{validation.isValid ? "✅ Imagem validada" : "❌ Erro na validação"}</div>
                                <div className="imageUploadField__validationMessage">{getRecommendationMessage(validation)}</div>
                            </div>
                        </div>

                        {validation.dimensions && (
                            <div className="imageUploadField__details">
                                <div className="imageUploadField__detailItem">
                                    <span>Dimensões:</span>
                                    <code>{formatDimensions(validation.dimensions.width, validation.dimensions.height)}</code>
                                </div>
                                <div className="imageUploadField__detailItem">
                                    <span>Proporção:</span>
                                    <code>{validation.dimensions.aspectRatio.toFixed(2)}</code>
                                </div>
                                <div className="imageUploadField__detailItem">
                                    <span>Tamanho:</span>
                                    <code>{formatFileSize(selectedFile.size)}MB</code>
                                </div>
                                {match !== null && (
                                    <div className="imageUploadField__detailItem">
                                        <span>Correspondência:</span>
                                        <div className="imageUploadField__matchBar">
                                            <div className="imageUploadField__matchFill" style={{ width: `${match}%` }}></div>
                                        </div>
                                        <code>{match.toFixed(0)}%</code>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Preview de imagem */}
                {preview && (
                    <div className="imageUploadField__previewContainer">
                        <img src={preview} alt="Preview" className="imageUploadField__preview" />
                        <div className="imageUploadField__previewInfo">
                            {selectedFile && validation?.dimensions && (
                                <>
                                    <div>{formatDimensions(validation.dimensions.width, validation.dimensions.height)}</div>
                                    <div>{formatFileSize(selectedFile.size)}MB</div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Botões de ação */}
                {selectedFile && (
                    <div className="imageUploadField__actions">
                        <button type="button" onClick={() => onFileSelect(null)} className="imageUploadField__btnMudar">
                            Mudar imagem
                        </button>
                    </div>
                )}

                {isValidating && (
                    <div className="imageUploadField__loading">
                        <div className="spinner"></div>
                        <div>Validando imagem...</div>
                    </div>
                )}
            </div>
        </div>
    );
}
