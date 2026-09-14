const express=require("express");const multer=require("multer");const pdfParse=require("pdf-parse");const OpenAI=require("openai");require("dotenv").config();
const app=express(),upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024}});
app.use(express.static("public"));
app.post("/api/generate",upload.single("pdf"),async(req,res)=>{
try{
 if(!req.file)return res.status(400).json({error:"PDF missing"});
 if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"AI key not configured on server"});
 const parsed=await pdfParse(req.file.buffer);const source=parsed.text.trim();if(!source)return res.status(400).json({error:"This PDF appears scanned/image-only. OCR is needed."});
 const settings={marks:+req.body.marks||50,duration:req.body.duration,difficulty:req.body.difficulty,count:+req.body.count||20,types:req.body.types,mode:req.body.mode,output:req.body.output,instructions:req.body.instructions};
 const schema={type:"object",additionalProperties:false,properties:{title:{type:"string"},instructions:{type:"string"},total_marks:{type:"number"},questions:{type:"array",items:{type:"object",additionalProperties:false,properties:{number:{type:"integer"},text:{type:"string"},type:{type:"string"},marks:{type:"number"},options:{type:"array",items:{type:"string"}},answer:{type:"string"},solution:{type:"string"},source_topic:{type:"string"}},required:["number","text","type","marks","options","answer","solution","source_topic"]}},validation_notes:{type:"array",items:{type:"string"}}},required:["title","instructions","total_marks","questions","validation_notes"]};
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
 const prompt=`Create an exam paper from the supplied educational PDF. It may be any school, college, diploma, engineering, technical or professional subject. Respect these settings: ${JSON.stringify(settings)}. In Strict mode use only the PDF. Avoid duplicates. Balance marks and difficulty. Numerical/engineering solutions must show formulas, substitutions, units and final answers. Return only JSON matching the schema. SOURCE:\\n${source.slice(0,180000)}`;
 const r=await client.responses.create({model:"gpt-5.4-mini",input:[{role:"system",content:"You are an expert exam-paper generator and solution writer."},{role:"user",content:prompt}],text:{format:{type:"json_schema",name:"paper",strict:true,schema}}});
 res.json(JSON.parse(r.output_text));
}catch(e){console.error(e);res.status(500).json({error:e.message||"Generation failed"})}});
app.listen(process.env.PORT||3000,()=>console.log("PaperCraft AI on port "+(process.env.PORT||3000)));