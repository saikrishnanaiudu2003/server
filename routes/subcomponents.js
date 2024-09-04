const express = require('express');
const SubComponent = require('../models/SubComponent');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const Component = require('../models/Component');
function getBucket(req) {
    if (req.app && req.app.locals && req.app.locals.bucket) {
        return req.app.locals.bucket;
    } else {
        throw new Error('GridFSBucket instance is not initialized');
    }
}
 
// Multer setup to handle file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });



// Upload Image and Create SubComponent
router.post('/create/:componentId', upload.single('image'), async (req, res) => {
    const { title, text, spanText, buttonText, description, htmlContent } = req.body;
    const { componentId } = req.params;

    if (!title || !componentId) {
        return res.status(400).json({ error: 'Title and componentId are required' });
    }

    try {
        let imageFilename = null;

        // If a file is uploaded, save it to GridFS
        if (req.file) {
            const bucket = getBucket(req); // Use getBucket to get GridFSBucket instance
            const uploadStream = bucket.openUploadStream(req.file.originalname, {
                contentType: req.file.mimetype
            });
            uploadStream.end(req.file.buffer);

            imageFilename = req.file.originalname;
        }

        const subComponent = new SubComponent({
            title,
            text,
            spanText,
            buttonText,
            description,
            image: imageFilename, // Save the filename of the image
            componentId,
            htmlContent
        });

        await subComponent.save();
        await Component.findByIdAndUpdate(componentId, { $push: { subComponents: subComponent._id } });
        res.status(201).json({ message: 'SubComponent created successfully', subComponent });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'An error occurred while creating the SubComponent' });
    }
});
router.put('/update/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, text, spanText, buttonText, description,htmlContent  } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid SubComponent ID' });
    }

    try {
        const subComponent = await SubComponent.findById(id);

        if (!subComponent) {
            return res.status(404).json({ error: 'SubComponent not found' });
        }

        // Update fields
        if (title !== undefined) subComponent.title = title;
        if (text !== undefined) subComponent.text = text;
        if (spanText !== undefined) subComponent.spanText = spanText;
        if (buttonText !== undefined) subComponent.buttonText = buttonText;
        if (description !== undefined) subComponent.description = description;
        if (htmlContent !== undefined) subComponent.htmlContent = htmlContent;
        // Handle image update
        if (req.file) {
            subComponent.image = req.file.filename;
        }

        await subComponent.save();
        res.status(200).json({ message: 'SubComponent updated successfully', subComponent });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'An error occurred while updating the SubComponent' });
    }
});
router.get('/:componentId', async (req, res) => {
    const { componentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(componentId)) {
        return res.status(400).json({ error: 'Invalid componentId' });
    }

    try {
        const subComponents = await SubComponent.find({ componentId });
        res.json({ subComponents });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Example backend route to fetch a specific subcomponent by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const subComponent = await SubComponent.findById(id);
        if (!subComponent) {
            return res.status(404).json({ error: 'Subcomponent not found' });
        }
        res.status(200).json({ subComponent });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
 
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid SubComponent ID' });
    }
 
    try {
        // Find and delete the subcomponent
        const subComponent = await SubComponent.findByIdAndDelete(id);
 
        if (!subComponent) {
            return res.status(404).json({ error: 'SubComponent not found' });
        }
 
        // Remove reference to the subcomponent from its parent component
        await Component.updateMany(
            { subComponents: id },
            { $pull: { subComponents: id } }
        );
 
        // If there was an image associated with the subcomponent, you might want to delete it from GridFS here
        // You would need to use the GridFS bucket to delete the file based on its filename
        // For example:
        // const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
        // bucket.delete(subComponent.image);
 
        res.status(200).json({ message: 'SubComponent deleted successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while deleting the SubComponent' });
    }
});

router.get('/:componentId/all-images', async (req, res) => {
    const { componentId } = req.params;
 
    try {
        // Fetch the component with its subcomponents
        const component = await Component.findById(componentId).populate('subComponents');
 
        if (!component) {
            return res.status(404).json({ error: 'Component not found' });
        }
 
        // Collect images from the component itself and its subcomponents
        const componentImages = component.images || [];
        const subComponentImages = component.subComponents.reduce((images, subComponent) => {
            if (subComponent.image) {
                images.push(subComponent.image);
            }
            return images;
        }, []);
 
        // Combine all images
        const allImages = [...componentImages, ...subComponentImages];
 
        res.status(200).json({
            name: component.name,
            images: allImages
        });
    } catch (error) {
        console.error('Error fetching all images:', error);
        res.status(500).json({ error: 'An error occurred while fetching images' });
    }
});

router.get('/images/:filename', (req, res) => {
    const { filename } = req.params;
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    bucket.openDownloadStreamByName(filename).pipe(res);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
 
    try {
        // Fetch the project and populate components and subcomponents
        const project = await Project.findById(id)
            .populate({
                path: 'components',
                model: 'Component',
                populate: {
                    path: 'subComponents',
                    model: 'SubComponent'
                }
            });
 
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
 
        // Send the populated project data as a response
        res.status(200).json({ project });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'An error occurred while fetching the project' });
    }
});
 
module.exports = router;
