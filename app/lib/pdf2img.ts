export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;
let workerInitialized = false;

async function loadPdfJs(): Promise<any> {
    // Only load on client-side
    if (typeof window === 'undefined') {
        throw new Error('PDF.js can only be loaded in the browser');
    }

    if (pdfjsLib && workerInitialized) return pdfjsLib;
    if (loadPromise) return loadPromise;

    // @ts-ignore - pdfjs-dist type definitions issue
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        console.log("PDF.js library loaded");
        
        // Try multiple worker sources
        const workerSources = [
            `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`,
            `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`,
            `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`
        ];
        
        // Use the first worker source
        lib.GlobalWorkerOptions.workerSrc = workerSources[0];
        console.log("Worker source set to:", lib.GlobalWorkerOptions.workerSrc);
        
        pdfjsLib = lib;
        workerInitialized = true;
        return lib;
    }).catch(error => {
        console.error("Failed to load PDF.js:", error);
        loadPromise = null;
        workerInitialized = false;
        throw error;
    });

    return loadPromise;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    // Ensure we're running in browser
    if (typeof window === 'undefined') {
        return {
            imageUrl: "",
            file: null,
            error: "PDF conversion can only run in the browser",
        };
    }

    try {
        console.log("=== Starting PDF Conversion ===");
        console.log("File name:", file.name);
        console.log("File size:", file.size, "bytes");
        console.log("File type:", file.type);
        
        // Validate it's a PDF
        if (file.type !== 'application/pdf') {
            throw new Error(`Invalid file type: ${file.type}. Expected: application/pdf`);
        }

        // Load PDF.js library
        console.log("Loading PDF.js library...");
        const lib = await loadPdfJs();
        console.log("PDF.js loaded successfully");

        // Convert file to array buffer
        console.log("Reading file as array buffer...");
        const arrayBuffer = await file.arrayBuffer();
        console.log("Array buffer size:", arrayBuffer.byteLength, "bytes");

        if (arrayBuffer.byteLength === 0) {
            throw new Error("File is empty");
        }

        // Load the PDF document
        console.log("Loading PDF document...");
        const loadingTask = lib.getDocument({ 
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true
        });
        
        const pdf = await loadingTask.promise;
        console.log("PDF loaded successfully");
        console.log("Number of pages:", pdf.numPages);

        // Get the first page
        console.log("Getting first page...");
        const page = await pdf.getPage(1);
        console.log("First page retrieved");

        // Set scale for better quality
        const scale = 2.5;
        console.log("Creating viewport with scale:", scale);
        const viewport = page.getViewport({ scale: scale });
        console.log("Viewport size:", viewport.width, "x", viewport.height);
        
        // Create canvas
        console.log("Creating canvas...");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { 
            alpha: false,
            willReadFrequently: false
        });

        if (!context) {
            throw new Error("Failed to get canvas 2D context");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        console.log("Canvas created:", canvas.width, "x", canvas.height);

        // Set rendering quality
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        // Render page
        console.log("Rendering page to canvas...");
        const renderTask = page.render({
            canvasContext: context,
            viewport: viewport,
        } as any);
        
        await renderTask.promise;
        console.log("Page rendered successfully");

        // Convert canvas to blob
        console.log("Converting canvas to blob...");
        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        console.log("✓ Image file created successfully");
                        console.log("Image file name:", imageFile.name);
                        console.log("Image file size:", imageFile.size, "bytes");
                        console.log("=== Conversion Complete ===");

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        console.error("✗ Failed to create blob from canvas");
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob",
                        });
                    }
                },
                "image/png",
                0.95
            );
        });
    } catch (err: any) {
        console.error("=== PDF Conversion Failed ===");
        console.error("Error:", err);
        console.error("Error name:", err?.name);
        console.error("Error message:", err?.message);
        console.error("Error stack:", err?.stack);
        
        let errorMessage = "Unknown error";
        if (err?.message) {
            errorMessage = err.message;
        } else if (typeof err === 'string') {
            errorMessage = err;
        }
        
        return {
            imageUrl: "",
            file: null,
            error: `PDF conversion failed: ${errorMessage}`,
        };
    }
}