import XLSX from 'xlsx';

const REQUIRED_HEADERS = ['name', 'rollno', 'repourl', 'grouptype'];

const normalizeHeader = (header) => header?.toString().trim().toLowerCase();

const normalizeGroupType = (value) => {
  const normalized = value?.toString().trim().toLowerCase();
  if (!normalized) return null;

  const mappings = {
    coursework: 'courseWork',
    'course work': 'courseWork',
    'course-work': 'courseWork',
    'course_work': 'courseWork',
    personalprojects: 'personalProjects',
    'personal projects': 'personalProjects',
    'personal-projects': 'personalProjects',
    'personal_projects': 'personalProjects',
  };

  return mappings[normalized] ?? null;
};

const parseWorkbook = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error('Excel file is empty or invalid.');
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rows.length) {
    throw new Error('Excel sheet has no data rows.');
  }

  const headerRow = Object.keys(rows[0]).map((key) => normalizeHeader(key));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerRow.includes(header));

  if (missingHeaders.length) {
    throw new Error(
      `Missing required column(s): ${missingHeaders.join(', ')}. Expected headers: Name, RollNo, RepoURL, GroupType`,
    );
  }

  const students = rows.map((row, index) => {
    const name = row.Name ?? row.name;
    const rollNumber = row.RollNo ?? row.rollno;
    const repoUrl = row.RepoURL ?? row.repourl;
    const groupTypeRaw = row.GroupType ?? row.grouptype;

    const groupType = normalizeGroupType(groupTypeRaw);

    if (!name || !rollNumber || !repoUrl || !groupType) {
      throw new Error(
        `Invalid data on row ${index + 2}. Ensure Name, RollNo, RepoURL, GroupType are populated and group type is either courseWork or personalProjects.`,
      );
    }

    return {
      name: name.toString().trim(),
      rollNumber: rollNumber.toString().trim(),
      repoUrl: repoUrl.toString().trim(),
      groupType,
    };
  });

  return students;
};

export default parseWorkbook;
