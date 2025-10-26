<?php
header('Content-Type: application/json');

// NOTE: Adjust the path to your submissions.json file if needed.
$data_file = '../data/submissions.json';

function loadArtworks($data_file) {
    if (!file_exists($data_file)) {
        // Return an error response instead of just an empty array
        http_response_code(500);
        die(json_encode(['error' => 'Data file not found.']));
    }
    $json_data = file_get_contents($data_file);

    return json_decode($json_data, true) ?? [];
}

// 1. Load ALL artworks and filter by 'approved' status
$allArtworks = loadArtworks($data_file);
$artworks = array_filter($allArtworks, function($art) {
    return isset($art['status']) && $art['status'] === 'approved';
});
$artworks = array_values($artworks); // Re-index array after filtering

// 2. Get query parameters
$search_term = strtolower(trim($_GET['search'] ?? ''));
$type_filter = strtolower(trim($_GET['type'] ?? ''));
$period_filter = strtolower(trim($_GET['period'] ?? ''));
$location_filter = strtolower(trim($_GET['location'] ?? ''));
$sort_by = trim($_GET['sort'] ?? '');
// Pagination parameters
$page = (int)($_GET['page'] ?? 1);
$limit = (int)($_GET['limit'] ?? 8); // Default limit is 8


// 3. Apply Filters
if (!empty($search_term)) {
    $artworks = array_filter($artworks, function($art) use ($search_term) {
        $title = strtolower($art['title'] ?? '');
        $description = strtolower($art['description'] ?? '');
        $artist = strtolower($art['artist_name'] ?? '');

        return str_contains($title, $search_term) ||
               str_contains($description, $search_term) ||
               str_contains($artist, $search_term);
    });
    $artworks = array_values($artworks);
}

if (!empty($type_filter)) {
    $artworks = array_filter($artworks, function($art) use ($type_filter) {
        // We use str_contains because the type field might contain more descriptive text
        return str_contains(strtolower($art['type'] ?? ''), $type_filter);
    });
    $artworks = array_values($artworks);
}

if (!empty($period_filter)) {
    $artworks = array_filter($artworks, function($art) use ($period_filter) {
        return strtolower($art['period'] ?? '') === $period_filter;
    });
    $artworks = array_values($artworks);
}


if (!empty($location_filter)) {
    $artworks = array_filter($artworks, function($art) use ($location_filter) {
        $notes = strtolower($art['location_notes'] ?? '');
        
        // **FIXED/COMPLETED LOCATION FILTERING LOGIC**
        if ($location_filter === 'nsw') {
            return str_contains($notes, 'sydney') || str_contains($notes, 'nsw');
        } elseif ($location_filter === 'sa') {
            return str_contains($notes, 'adelaide') || str_contains($notes, 'south australia') || str_contains($notes, 'sa');
        } elseif ($location_filter === 'wa') {
            return str_contains($notes, 'perth') || str_contains($notes, 'western australia') || str_contains($notes, 'wa');
        }
        
        return false; 
    });
    $artworks = array_values($artworks);
}

// 4. Apply Sorting
if (!empty($sort_by)) {
    usort($artworks, function($a, $b) use ($sort_by) {
        $titleA = $a['title'] ?? '';
        $titleB = $b['title'] ?? '';
        
        // Use created_at for sorting by date added
        $dateA = $a['created_at'] ?? '1970-01-01 00:00:00';
        $dateB = $b['created_at'] ?? '1970-01-01 00:00:00';

        if ($sort_by === 'title-asc') {
            return strcmp($titleA, $titleB);
        } elseif ($sort_by === 'title-desc') {
            return strcmp($titleB, $titleA);
        } elseif ($sort_by === 'date-newest') { 
             return strtotime($dateB) - strtotime($dateA); // Descending (Newest first)
        } elseif ($sort_by === 'date-oldest') { 
            return strtotime($dateA) - strtotime($dateB); // Ascending (Oldest first)
        }
        return 0;
    });
}

// 5. Pagination Logic
$total_artworks = count($artworks);
$total_pages = ceil($total_artworks / $limit);

// Validate and correct page number
if ($page < 1) $page = 1;
// Ensure page number doesn't exceed total pages, unless there are no artworks
if ($total_pages > 0 && $page > $total_pages) $page = $total_pages;

// Calculate offset and apply the slice
$offset = ($page - 1) * $limit;
// Only slice if there are results
$paginated_artworks = $total_artworks > 0 ? array_slice($artworks, $offset, $limit) : [];

// 6. Return the final result
echo json_encode([
    'total' => $total_artworks,
    'total_pages' => $total_pages,
    'current_page' => $page,
    'limit' => $limit,
    'artworks' => $paginated_artworks,
]);

?>