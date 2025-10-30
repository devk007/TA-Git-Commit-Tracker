import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    studentsUploaded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const ClassModel = mongoose.model('Class', classSchema);

export default ClassModel;
