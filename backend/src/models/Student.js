import mongoose from 'mongoose';

const { Schema } = mongoose;

const studentSchema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    groupType: {
      type: String,
      required: true,
      enum: ['courseWork', 'personalProjects'],
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

studentSchema.index({ classId: 1, rollNumber: 1 }, { unique: true });
studentSchema.index({ classId: 1, repoUrl: 1 }, { unique: true });

const StudentModel = mongoose.model('Student', studentSchema);

export default StudentModel;
