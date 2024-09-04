const express = require('express');
const Project = require('../models/Project');
const Component = require('../models/Component');
const SubComponent = require('../models/SubComponent');
const router = express.Router();

// Define more specific routes first
router.get('/all-projects', async (req, res) => {
    try {
        const projects = await Project.find({})
            .populate({
                path: 'components',
                populate: {
                    path: 'subComponents',
                    model: 'SubComponent'
                }
            });

        res.status(200).json({ projects });
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(400).json({ error: "An error occurred while fetching the projects" });
    }
});

router.get('/name/:projectId', async (req, res) => {
    const { projectId } = req.params;

    try {
        const project = await Project.findById(projectId).select('name'); // Fetch only the name field
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.status(200).json({ project });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'An error occurred while fetching the project' });
    }
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

// Create Project route
router.post('/create', async (req, res) => {
    const { name, htmlContent } = req.body; // Expecting HTML content

    try {
        const newProject = new Project({
            name: name || htmlContent // Save HTML content if that's what you want to use
        });

        const savedProject = await newProject.save();
        res.status(201).json(savedProject);
    } catch (error) {
        res.status(500).json({ error: 'Error creating project' });
    }
});

module.exports = router;
