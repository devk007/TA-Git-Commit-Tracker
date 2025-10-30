import mongoose from 'mongoose';

const { Schema } = mongoose;

const commitSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    sha: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    htmlUrl: {
      type: String,
      trim: true,
    },
    authorDate: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

commitSchema.index({ student: 1, sha: 1 }, { unique: true });
commitSchema.index({ class: 1, authorDate: 1 });

const CommitModel = mongoose.model('Commit', commitSchema);

export default CommitModel;
