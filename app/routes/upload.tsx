import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if(!uploadedFile) {
                setStatusText('Error: Failed to upload file');
                setIsProcessing(false);
                return;
            }
            console.log('✓ File uploaded:', uploadedFile.path);

            setStatusText('Converting PDF to image...');
            const imageFile = await convertPdfToImage(file);
            
            if(imageFile.error) {
                console.error('PDF conversion error:', imageFile.error);
                setStatusText(`Error: ${imageFile.error}`);
                setIsProcessing(false);
                return;
            }
            
            if(!imageFile.file) {
                setStatusText('Error: Failed to convert PDF to image');
                setIsProcessing(false);
                return;
            }
            console.log('✓ PDF converted to image');

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if(!uploadedImage) {
                setStatusText('Error: Failed to upload image');
                setIsProcessing(false);
                return;
            }
            console.log('✓ Image uploaded:', uploadedImage.path);

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName, 
                jobTitle, 
                jobDescription,
                feedback: '',
            }
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            console.log('✓ Data saved to KV store');

            setStatusText('Analyzing resume with AI...');
            console.log('Sending to AI for analysis...');

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            )
            
            if (!feedback) {
                setStatusText('Error: Failed to analyze resume');
                setIsProcessing(false);
                return;
            }

            console.log('✓ AI feedback received',{ feedback });

            const feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : feedback.message.content[0].text;

            data.feedback = JSON.parse(feedbackText);
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            
            setStatusText('Analysis complete! Redirecting...');
            console.log('='.repeat(50));
            console.log('📊 FINAL RESUME DATA:');
            console.log('='.repeat(50));
            console.log('ID:', data.id);
            console.log('Company:', data.companyName);
            console.log('Job Title:', data.jobTitle);
            console.log('Resume Path:', data.resumePath);
            console.log('Image Path:', data.imagePath);
            console.log('Feedback:', data.feedback);
            console.log('='.repeat(50));
            
            setTimeout(() => {
                navigate(`/resume/${uuid}`);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Analysis error:', error);
            setStatusText(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            setIsProcessing(false);
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) {
            alert('Please upload a resume file');
            return;
        }

        if(!companyName || !jobTitle || !jobDescription) {
            alert('Please fill in all fields');
            return;
        }

        console.log('Starting analysis with:', { companyName, jobTitle, file: file.name ,});
        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" alt="Processing" className="w-full max-w-md mx-auto" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input 
                                    type="text" 
                                    name="company-name" 
                                    placeholder="Company Name" 
                                    id="company-name"
                                    required
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input 
                                    type="text" 
                                    name="job-title" 
                                    placeholder="Job Title" 
                                    id="job-title"
                                    required
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea 
                                    rows={5} 
                                    name="job-description" 
                                    placeholder="Job Description" 
                                    id="job-description"
                                    required
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}

export default Upload